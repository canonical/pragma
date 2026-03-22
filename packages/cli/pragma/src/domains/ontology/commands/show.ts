/**
 * `pragma ontology show` command definition.
 */

import {
  type CommandDefinition,
  type CommandResult,
  createOutputResult,
} from "@canonical/cli-core";
import { PragmaError } from "#error";
import type { PragmaContext } from "../../shared/context.js";
import { selectFormatter } from "../../shared/formatters.js";
import { showFormatters } from "../formatters/index.js";
import { listOntologies, showOntology } from "../operations/index.js";

export default function buildShowCommand(
  ctx: PragmaContext,
): CommandDefinition {
  return {
    path: ["ontology", "show"],
    description: "Show ontology schema details",
    parameters: [
      {
        name: "prefix",
        description: "Ontology prefix (e.g. 'ds', 'cs')",
        type: "string",
        positional: true,
        required: true,
        complete: async (partial: string) => {
          const all = await listOntologies(ctx.store);
          return all
            .map((o) => o.prefix)
            .filter((p) => p.toLowerCase().startsWith(partial.toLowerCase()));
        },
      },
    ],
    meta: {
      examples: ["pragma ontology show ds", "pragma ontology show cs --llm"],
    },
    execute: async (
      params: Record<string, unknown>,
    ): Promise<CommandResult> => {
      const prefix = params.prefix as string;
      if (!prefix) {
        throw PragmaError.invalidInput("prefix", "(empty)", {
          recovery: {
            message: "List loaded ontologies to find valid prefixes.",
            cli: "pragma ontology list",
            mcp: { tool: "ontology_list" },
          },
        });
      }

      const result = await showOntology(ctx.store, prefix);

      return createOutputResult(result, {
        plain: selectFormatter(ctx, showFormatters),
      });
    },
  };
}
