/**
 * Boot-time validation for prompt definitions.
 *
 * Mirrors `validateStoryPackDefinition`: invalid documents are rejected
 * with a typed CONFIG_ERROR carrying the source path, and the registry
 * loader skips them with a warning so one bad prompt cannot break boot.
 *
 * Safety rules (locked):
 * - embeds may only call REGISTERED tools whose spec is `readOnly: true`;
 * - raw-query tools (`graph_query`, `graphql_*`) are denied outright —
 *   their params are query text and `{{arg}}` splicing into them would be
 *   an injection channel;
 * - `{{arg}}` placeholders are allowed only in the template and in
 *   `embed.args` string VALUES, which pass through the target tool's own
 *   param validation after splicing.
 */

import { PragmaError } from "#error";
import type { ToolSpec } from "../shared/ToolSpec.js";
import type {
  PromptArgumentDef,
  PromptDefinition,
  PromptEmbed,
} from "./types.js";

/** Kebab-case prompt names: `implement-component`. */
const PROMPT_NAME = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

/** Argument names: `[a-z][a-z0-9_]*`. */
const ARGUMENT_NAME = /^[a-z][a-z0-9_]*$/;

/** Tools whose params are raw query text — never embeddable. */
const DENIED_TOOLS = /^(graph_query|graphql_.*)$/;

/** The `pragma://` resource embeds may name besides graph entities. */
const STATE_RESOURCE = "pragma://state";

function fail(source: string, reason: string): never {
  throw PragmaError.configError(`Invalid prompt in ${source}: ${reason}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Collect `{{arg}}` placeholder names appearing in a string. */
function placeholdersIn(text: string): string[] {
  return [...text.matchAll(/\{\{([a-z][a-z0-9_]*)\}\}/g)].map(
    (match) => match[1] as string,
  );
}

function validateArgument(
  name: string,
  raw: unknown,
  source: string,
  toolSpecs: ReadonlyMap<string, ToolSpec>,
): PromptArgumentDef {
  if (!ARGUMENT_NAME.test(name)) {
    fail(source, `argument name "${name}" must match [a-z][a-z0-9_]*`);
  }
  if (!isRecord(raw)) {
    fail(source, `argument "${name}" must be an object`);
  }
  if (typeof raw.description !== "string" || raw.description === "") {
    fail(source, `argument "${name}" needs a description`);
  }
  if (raw.required !== undefined && typeof raw.required !== "boolean") {
    fail(source, `argument "${name}".required must be a boolean`);
  }
  let completeFrom: PromptArgumentDef["completeFrom"];
  if (raw.completeFrom !== undefined) {
    if (
      !isRecord(raw.completeFrom) ||
      typeof raw.completeFrom.tool !== "string" ||
      typeof raw.completeFrom.field !== "string"
    ) {
      fail(source, `argument "${name}".completeFrom needs { tool, field }`);
    }
    const completionSpec = toolSpecs.get(raw.completeFrom.tool);
    if (!completionSpec || !completionSpec.readOnly) {
      fail(
        source,
        `argument "${name}".completeFrom.tool "${raw.completeFrom.tool}" must be a registered read-only tool`,
      );
    }
    completeFrom = {
      tool: raw.completeFrom.tool,
      field: raw.completeFrom.field,
    };
  }
  return {
    description: raw.description,
    ...(raw.required !== undefined ? { required: raw.required } : {}),
    ...(completeFrom ? { completeFrom } : {}),
  };
}

function validateEmbed(
  raw: unknown,
  index: number,
  source: string,
  toolSpecs: ReadonlyMap<string, ToolSpec>,
): PromptEmbed {
  if (!isRecord(raw)) {
    fail(source, `embed[${index}] must be an object`);
  }
  if (typeof raw.heading !== "string" || raw.heading === "") {
    fail(source, `embed[${index}] needs a heading`);
  }
  const hasTool = raw.tool !== undefined;
  const hasResource = raw.resource !== undefined;
  if (hasTool === hasResource) {
    fail(source, `embed[${index}] must set exactly one of tool or resource`);
  }

  if (hasResource) {
    if (typeof raw.resource !== "string" || raw.resource === "") {
      fail(source, `embed[${index}].resource must be a non-empty string`);
    }
    if (
      raw.resource.startsWith("pragma://") &&
      raw.resource !== STATE_RESOURCE
    ) {
      fail(
        source,
        `embed[${index}].resource "${raw.resource}" — only ${STATE_RESOURCE} and graph-entity URIs are embeddable`,
      );
    }
    return { resource: raw.resource, heading: raw.heading };
  }

  if (typeof raw.tool !== "string" || raw.tool === "") {
    fail(source, `embed[${index}].tool must be a non-empty string`);
  }
  if (DENIED_TOOLS.test(raw.tool)) {
    fail(
      source,
      `embed[${index}].tool "${raw.tool}" takes raw query text and cannot be embedded`,
    );
  }
  const spec = toolSpecs.get(raw.tool);
  if (!spec) {
    fail(source, `embed[${index}].tool "${raw.tool}" is not a registered tool`);
  }
  if (!spec.readOnly) {
    fail(source, `embed[${index}].tool "${raw.tool}" is not read-only`);
  }
  let args: Readonly<Record<string, string>> | undefined;
  if (raw.args !== undefined) {
    if (!isRecord(raw.args)) {
      fail(source, `embed[${index}].args must be an object`);
    }
    for (const [key, value] of Object.entries(raw.args)) {
      if (typeof value !== "string") {
        fail(
          source,
          `embed[${index}].args.${key} must be a string ({{arg}} splices only into string values)`,
        );
      }
    }
    args = raw.args as Record<string, string>;
  }
  return {
    tool: raw.tool,
    ...(args ? { args } : {}),
    heading: raw.heading,
  };
}

/**
 * Validate one raw prompt document into a {@link PromptDefinition}.
 *
 * @param raw - The unvalidated document (bundled data or a loaded file).
 * @param source - Where it was declared, for diagnostics.
 * @param toolSpecs - The SAME tool-spec production the server registers
 *   (built-ins + compiled pack tools) — embeds validate against it.
 * @returns The validated definition.
 * @throws PragmaError with code `CONFIG_ERROR` naming the source and rule.
 */
export default function validatePromptDefinition(
  raw: unknown,
  source: string,
  toolSpecs: readonly ToolSpec[],
): PromptDefinition {
  if (!isRecord(raw)) {
    fail(source, "definition must be an object");
  }
  if (typeof raw.name !== "string" || !PROMPT_NAME.test(raw.name)) {
    fail(source, `name "${String(raw.name)}" must be kebab-case`);
  }
  if (typeof raw.description !== "string" || raw.description === "") {
    fail(source, "description is required");
  }
  if (typeof raw.template !== "string" || raw.template === "") {
    fail(source, "template is required");
  }
  if (
    raw.budget !== undefined &&
    (typeof raw.budget !== "number" || raw.budget <= 0)
  ) {
    fail(source, "budget must be a positive number of tokens");
  }

  const specsByName = new Map(toolSpecs.map((spec) => [spec.name, spec]));

  const args: Record<string, PromptArgumentDef> = {};
  if (raw.arguments !== undefined) {
    if (!isRecord(raw.arguments)) {
      fail(source, "arguments must be an object");
    }
    for (const [name, def] of Object.entries(raw.arguments)) {
      args[name] = validateArgument(name, def, source, specsByName);
    }
  }

  const embeds: PromptEmbed[] = [];
  if (raw.embed !== undefined) {
    if (!Array.isArray(raw.embed)) {
      fail(source, "embed must be an array");
    }
    raw.embed.forEach((entry, index) => {
      embeds.push(validateEmbed(entry, index, source, specsByName));
    });
  }

  // Placeholders may only reference declared arguments, and required
  // arguments must be reachable from the template or an embed arg value.
  const spliceSites = [
    raw.template,
    ...embeds.flatMap((embed) =>
      "args" in embed && embed.args ? Object.values(embed.args) : [],
    ),
  ];
  const referenced = new Set(spliceSites.flatMap(placeholdersIn));
  for (const name of referenced) {
    if (!(name in args)) {
      fail(source, `placeholder {{${name}}} names an undeclared argument`);
    }
  }
  for (const [name, def] of Object.entries(args)) {
    if (def.required === true && !referenced.has(name)) {
      fail(
        source,
        `required argument "${name}" never appears in the template or an embed arg`,
      );
    }
  }

  return {
    name: raw.name,
    description: raw.description,
    ...(Object.keys(args).length > 0 ? { arguments: args } : {}),
    template: raw.template,
    ...(embeds.length > 0 ? { embed: embeds } : {}),
    ...(raw.budget !== undefined ? { budget: raw.budget as number } : {}),
  };
}
