import {
  type CommandDefinition,
  type CommandResult,
  createOutputResult,
} from "@canonical/cli-core";
import { PragmaError } from "#error";
import { collectToolSpecs } from "../../../mcp/tools/index.js";
import type { PragmaContext } from "../../shared/context.js";
import { selectFormatter } from "../../shared/formatters.js";
import { suggestNames } from "../../shared/suggestions/index.js";
import collectPrompts from "../collectPrompts.js";
import { lookupFormatters } from "../formatters/index.js";
import hydratePrompt from "../operations/hydratePrompt.js";

/** `key=value` positional pair (keys follow the argument-name rule). */
const PAIR = /^([a-z][a-z0-9_]*)=(.*)$/;

/** Parse the trailing positionals into the `prompts/get` args map. */
function parsePairs(pairs: readonly string[]): Record<string, string> {
  const args: Record<string, string> = {};
  for (const pair of pairs) {
    const match = pair.match(PAIR);
    if (!match) {
      throw PragmaError.invalidInput("argument", pair, {
        recovery: {
          message:
            "Pass prompt arguments as key=value pairs (e.g. component=Button).",
        },
      });
    }
    args[match[1] as string] = match[2] as string;
  }
  return args;
}

/**
 * Build the `pragma prompt lookup <name> [key=value ...]` command.
 *
 * The variadic positionals after the name form the `prompts/get`
 * arguments map. MIRROR INVARIANT: `--format json` emits the exact
 * `GetPromptResult` the MCP server returns for the same call; text mode
 * prints the hydrated markdown (hydration warnings also go to stderr on
 * this path). `--detail` does not apply to prompts.
 *
 * @param ctx - Pragma context providing the store, config, and flags.
 * @returns The command definition for `pragma prompt lookup`.
 * @note - Impure — hydration executes read-only tools against the store.
 */
export default function buildPromptLookupCommand(
  ctx: PragmaContext,
): CommandDefinition {
  const loadRegistry = () => collectPrompts(ctx, collectToolSpecs(ctx));

  return {
    path: ["prompt", "lookup"],
    description: "Hydrate one prompt by name (MCP prompts/get mirror)",
    parameters: [
      {
        name: "input",
        description: "Prompt name, then arguments as key=value pairs",
        type: "multiselect",
        positional: true,
        required: true,
        complete: async (partial) => {
          const registry = await loadRegistry();
          return registry
            .map((entry) => entry.definition.name)
            .filter((name) =>
              name.toLowerCase().startsWith(partial.toLowerCase()),
            );
        },
      },
    ],
    meta: {
      examples: [
        "pragma prompt lookup implement-component component=Button",
        "pragma prompt lookup fix-empty-results",
      ],
    },
    execute: async (
      params: Record<string, unknown>,
    ): Promise<CommandResult> => {
      const input = Array.isArray(params.input)
        ? (params.input as string[])
        : typeof params.input === "string"
          ? [params.input]
          : [];
      const [name, ...pairs] = input;
      if (!name) {
        throw PragmaError.invalidInput("name", "(empty)", {
          recovery: {
            message: "List available prompts.",
            cli: "pragma prompt list",
          },
        });
      }

      const registry = await loadRegistry();
      const entry = registry.find((e) => e.definition.name === name);
      if (!entry) {
        throw PragmaError.notFound("prompt", name, {
          suggestions: suggestNames(
            name,
            registry.map((e) => e.definition.name),
          ),
          recovery: {
            message: "List available prompts.",
            cli: "pragma prompt list",
          },
        });
      }

      const hydrated = await hydratePrompt(
        ctx,
        entry.definition,
        parsePairs(pairs),
        collectToolSpecs(ctx),
        {
          // CLI path: degraded embeds also note on stderr (never stdout).
          onWarn: (line) => process.stderr.write(`${line}\n`),
        },
      );

      const format = selectFormatter(ctx, lookupFormatters);
      return createOutputResult(hydrated, { plain: format });
    },
  };
}
