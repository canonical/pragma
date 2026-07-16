/**
 * Adapter: prompt registry → `server.registerPrompt()`.
 *
 * The single point where PromptDefinition meets MCP infrastructure —
 * zod arg schemas (wrapped in `completable()` where an argument declares
 * `completeFrom`), and the hydration callback (D3a). Registering any
 * prompt auto-declares the `prompts` capability.
 *
 * Stdio safety: nothing on this path writes to stdout. Hydration
 * warnings live in the returned text; registry warnings go to stderr.
 */

import { completable } from "@modelcontextprotocol/sdk/server/completable.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  collectPrompts,
  hydratePrompt,
  type PromptCompleteFrom,
  type PromptRegistryEntry,
} from "../../domains/prompt/index.js";
import type { PragmaRuntime } from "../../domains/shared/runtime.js";
import type { ToolSpec } from "../../domains/shared/ToolSpec.js";

/** Cap completion values, mirroring the resource-completion limit. */
const COMPLETION_LIMIT = 100;

/**
 * Complete an argument from the tool declared in `completeFrom`: run the
 * (read-only, boot-validated) list tool, pluck the field, prefix-filter.
 */
async function completeFromTool(
  runtime: PragmaRuntime,
  specsByName: ReadonlyMap<string, ToolSpec>,
  completeFrom: PromptCompleteFrom,
  partial: string,
): Promise<string[]> {
  const spec = specsByName.get(completeFrom.tool);
  if (!spec) return [];
  try {
    const result = await spec.execute(runtime, {});
    if (!("data" in result) || !Array.isArray(result.data)) return [];
    const lower = partial.toLowerCase();
    const values = result.data
      .map((row) =>
        typeof row === "object" && row !== null
          ? (row as Record<string, unknown>)[completeFrom.field]
          : undefined,
      )
      .filter((value): value is string => typeof value === "string");
    return [...new Set(values)]
      .filter((value) => value.toLowerCase().startsWith(lower))
      .slice(0, COMPLETION_LIMIT);
  } catch {
    // Completion must never break the session — no values beats an error.
    return [];
  }
}

/** Build the zod args shape for one registry entry. */
function buildArgsSchema(
  runtime: PragmaRuntime,
  specsByName: ReadonlyMap<string, ToolSpec>,
  entry: PromptRegistryEntry,
): Record<string, z.ZodType<string | undefined>> | undefined {
  const declared = entry.definition.arguments;
  if (!declared) return undefined;

  const shape: Record<string, z.ZodType<string | undefined>> = {};
  for (const [name, def] of Object.entries(declared)) {
    const base = z.string().describe(def.description);
    const schema = def.required === true ? base : base.optional();
    shape[name] =
      def.completeFrom === undefined
        ? schema
        : completable(schema, (partial) =>
            completeFromTool(
              runtime,
              specsByName,
              def.completeFrom as PromptCompleteFrom,
              partial ?? "",
            ),
          );
  }
  return shape;
}

/**
 * Register the prompt surface on the MCP server.
 *
 * @param server - The MCP server to register prompts on.
 * @param runtime - The pragma runtime embeds execute against.
 * @param toolSpecs - The SAME tool production `registerAllTools` used —
 *   prompt embeds validate and resolve against it, never a second build.
 * @note Impure — discovers skills; registry warnings go to stderr.
 */
export default async function registerPrompts(
  server: McpServer,
  runtime: PragmaRuntime,
  toolSpecs: readonly ToolSpec[],
): Promise<void> {
  const registry = await collectPrompts(runtime, toolSpecs);
  const specsByName = new Map(toolSpecs.map((spec) => [spec.name, spec]));

  for (const entry of registry) {
    const { definition } = entry;
    const argsSchema = buildArgsSchema(runtime, specsByName, entry);

    const registered = server.registerPrompt(
      definition.name,
      {
        description: definition.description,
        ...(argsSchema ? { argsSchema } : {}),
      },
      async (args?: Record<string, unknown>) => {
        const argMap = Object.fromEntries(
          Object.entries(args ?? {}).filter(
            (pair): pair is [string, string] => typeof pair[1] === "string",
          ),
        );
        // No onWarn sink here: hydration warnings are lines in the text,
        // and the stdio transport owns stdout.
        return hydratePrompt(runtime, definition, argMap, toolSpecs);
      },
    );

    // MIRROR INVARIANT (negative inputs): `registerPrompt` wraps the raw
    // shape in a plain `z.object`, which STRIPS unknown keys in zod v3 —
    // an unknown argument would silently succeed on `prompts/get` while
    // `hydratePrompt`'s validateArgs rejects it on the CLI and aggregator
    // surfaces. Override the stored schema with a `.strict()` object over
    // the SAME shape (completable fields included, so completion and
    // prompts/list projection are unchanged) so all three surfaces share
    // one reject-unknowns boundary. The SDK's GetPrompt handler surfaces
    // the strict-parse failure as a clean InvalidParams protocol error.
    if (argsSchema) {
      registered.argsSchema = z.object(argsSchema).strict();
    }
  }
}
