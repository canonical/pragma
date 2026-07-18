/**
 * Prompt hydration engine (D3a — prompts hydrate by default).
 *
 * Splices arguments into the template, executes each declared embed
 * through the normal ToolSpec `execute` path (so pack-tool injection
 * safety holds by construction), renders every embed as a fenced JSON
 * section under its heading, and enforces the token budget with a
 * truncate-with-pointer rule. A failed embed degrades to the bare
 * template plus a warning line (and an optional caller-supplied warning
 * sink — the CLI points it at stderr; the MCP path relies on the in-text
 * line only, keeping stdio stdout pure).
 */

import { PragmaError } from "#error";
import resolveUri from "../../graph/helpers/resolveUri.js";
import { buildLiveStatePayload } from "../../shared/state/index.js";
import type { ToolParamDef, ToolSpec } from "../../shared/ToolSpec.js";
import type { PragmaRuntime } from "../../shared/types/index.js";
import type {
  HydratedPrompt,
  PromptDefinition,
  PromptEmbed,
  PromptResourceEmbed,
  PromptToolEmbed,
} from "../types.js";

/** Default hydration budget in tokens (est. chars/4). */
const DEFAULT_BUDGET_TOKENS = 4000;

/** chars-per-token estimate, matching the MCP token estimator. */
const CHARS_PER_TOKEN = 4;

/** Options for {@link hydratePrompt}. */
export interface HydrateOptions {
  /**
   * Warning sink for degraded embeds. The warning is ALWAYS a line in the
   * returned text; the CLI additionally passes a stderr writer here. The
   * MCP path must NOT write to stdout, so it passes nothing.
   */
  readonly onWarn?: (line: string) => void;
}

/** Splice `{{arg}}` placeholders with provided values (missing → ""). */
function splice(text: string, args: Readonly<Record<string, string>>): string {
  return text.replace(
    /\{\{([a-z][a-z0-9_]*)\}\}/g,
    (_, name: string) => args[name] ?? "",
  );
}

/**
 * Validate a `prompts/get` args map against the declared arguments.
 *
 * @throws PragmaError with code `INVALID_INPUT` for an unknown key or a
 *   missing required argument.
 */
function validateArgs(
  definition: PromptDefinition,
  args: Readonly<Record<string, string>>,
): void {
  const declared = definition.arguments ?? {};
  const names = Object.keys(declared);
  for (const key of Object.keys(args)) {
    if (!(key in declared)) {
      throw PragmaError.invalidInput(key, args[key] ?? "", {
        validOptions: names,
        recovery: {
          message:
            names.length > 0
              ? `Prompt "${definition.name}" accepts: ${names.join(", ")}.`
              : `Prompt "${definition.name}" takes no arguments.`,
        },
      });
    }
  }
  for (const [name, def] of Object.entries(declared)) {
    if (
      def.required === true &&
      (args[name] === undefined || args[name] === "")
    ) {
      throw PragmaError.invalidInput(name, "(missing)", {
        recovery: {
          message: `Required argument "${name}": ${def.description}`,
        },
      });
    }
  }
}

/**
 * Coerce spliced string args to the target tool's declared param types.
 *
 * A key the tool does not declare, or an enum mismatch, fails the embed
 * (degrades per D3a). A value that spliced to empty from a placeholder is
 * dropped — that is how an optional prompt argument omits a tool filter.
 */
function coerceEmbedArgs(
  spec: ToolSpec,
  rawArgs: Readonly<Record<string, string>>,
  args: Readonly<Record<string, string>>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(rawArgs)) {
    const def: ToolParamDef | undefined = spec.params?.[key];
    if (!def) {
      throw PragmaError.invalidInput(key, raw, {
        recovery: { message: `Tool ${spec.name} has no "${key}" param.` },
      });
    }
    const value = splice(raw, args);
    if (value === "" && raw !== "") {
      // An optional prompt arg was not provided — drop the filter.
      continue;
    }
    switch (def.type) {
      case "boolean":
        out[key] = value === "true";
        break;
      case "string[]":
        out[key] = [value];
        break;
      default:
        if (def.enum && !def.enum.includes(value)) {
          throw PragmaError.invalidInput(key, value, {
            validOptions: [...def.enum],
          });
        }
        out[key] = value;
        break;
    }
  }
  return out;
}

/** Render a payload as a fenced JSON block. */
function fencedJson(payload: unknown): string {
  return `\`\`\`json\n${JSON.stringify(payload, null, 2)}\n\`\`\``;
}

/** Execute one tool embed and render its body. */
async function renderToolEmbed(
  rt: PragmaRuntime,
  embed: PromptToolEmbed,
  args: Readonly<Record<string, string>>,
  specsByName: ReadonlyMap<string, ToolSpec>,
): Promise<string> {
  const spec = specsByName.get(embed.tool);
  if (!spec) {
    throw PragmaError.notFound("tool", embed.tool);
  }
  const params = coerceEmbedArgs(spec, embed.args ?? {}, args);
  const result = await spec.execute(rt, params);
  if ("condensed" in result) {
    return result.text;
  }
  return fencedJson(result.data);
}

/** Read one resource embed (pragma://state or a graph entity). */
async function renderResourceEmbed(
  rt: PragmaRuntime,
  embed: PromptResourceEmbed,
): Promise<string> {
  if (embed.resource === "pragma://state") {
    return fencedJson(buildLiveStatePayload(rt));
  }
  // Graph-entity URI — the same read path the MCP resource template uses.
  const { default: buildGraphIndex } = await import(
    "../../../mcp/resources/buildGraphIndex.js"
  );
  const { default: readEntity } = await import(
    "../../../mcp/resources/readEntity.js"
  );
  const prefixes = rt.store.prefixes;
  const fullUri = resolveUri(embed.resource, prefixes);
  const index = await buildGraphIndex(rt.store, prefixes);
  return fencedJson(await readEntity(rt.store, fullUri, prefixes, index));
}

/** The pointer target named in truncation/degradation lines. */
function embedPointer(embed: PromptEmbed): string {
  if ("tool" in embed) {
    const args = embed.args ? ` ${JSON.stringify(embed.args)}` : "";
    return `${embed.tool}${args}`;
  }
  return `read ${embed.resource}`;
}

/**
 * Hydrate a prompt definition into a `prompts/get` result.
 *
 * @param rt - The booted runtime embeds execute against.
 * @param definition - A validated prompt definition.
 * @param args - The `prompts/get` arguments map (string values).
 * @param toolSpecs - The registered tool production embeds resolve in.
 * @param options - Optional warning sink (CLI stderr).
 * @returns The hydrated `GetPromptResult`-shaped payload.
 * @throws PragmaError with code `INVALID_INPUT` on unknown/missing args.
 * @note Impure — embeds query the store / read config from disk.
 */
export default async function hydratePrompt(
  rt: PragmaRuntime,
  definition: PromptDefinition,
  args: Readonly<Record<string, string>>,
  toolSpecs: readonly ToolSpec[],
  options?: HydrateOptions,
): Promise<HydratedPrompt> {
  validateArgs(definition, args);

  const specsByName = new Map(toolSpecs.map((spec) => [spec.name, spec]));
  const budgetChars =
    (definition.budget ?? DEFAULT_BUDGET_TOKENS) * CHARS_PER_TOKEN;

  let text = splice(definition.template, args);
  let remaining = budgetChars - text.length;

  for (const embed of definition.embed ?? []) {
    let body: string;
    try {
      body =
        "tool" in embed
          ? await renderToolEmbed(rt, embed, args, specsByName)
          : await renderResourceEmbed(rt, embed);
    } catch (error) {
      const code = error instanceof PragmaError ? error.code : "ERROR";
      const warning = `⚠ could not hydrate ${embed.heading} (${code}) — run ${embedPointer(embed)} yourself.`;
      text += `\n\n${warning}`;
      remaining -= warning.length + 2;
      options?.onWarn?.(warning);
      continue;
    }

    let section = `\n\n## ${embed.heading}\n\n${body}`;
    if (section.length > remaining) {
      const pointer = `\n… truncated — run ${embedPointer(embed)} for the rest.`;
      section = `${section.slice(0, Math.max(0, remaining))}${pointer}`;
    }
    text += section;
    remaining -= section.length;
  }

  return {
    description: definition.description,
    messages: [{ role: "user", content: { type: "text", text } }],
  };
}
