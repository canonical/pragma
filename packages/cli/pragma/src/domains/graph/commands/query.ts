import {
  type CommandDefinition,
  type CommandResult,
  createOutputResult,
} from "@canonical/cli-core";
import { PragmaError } from "#error";
import type { PragmaContext } from "../../shared/context.js";
import { selectFormatter } from "../../shared/formatters.js";
import { queryFormatters } from "../formatters/index.js";
import { executeQuery } from "../operations/index.js";

/**
 * Builds the `pragma graph query` command definition.
 *
 * Accepts a raw SPARQL query string and executes it against the ke store.
 *
 * @param ctx - Pragma runtime context providing the ke store and config.
 * @returns A command definition for `graph query`.
 */
export default function buildQueryCommand(
  ctx: PragmaContext,
): CommandDefinition {
  return {
    path: ["graph", "query"],
    description: "Execute a SPARQL query",
    parameters: [
      {
        name: "sparql",
        description: "SPARQL query string",
        type: "string",
        positional: true,
        required: true,
      },
    ],
    meta: {
      examples: [
        'pragma graph query "SELECT (COUNT(*) AS ?n) WHERE { ?s ?p ?o }"',
        'pragma graph query "SELECT ?s WHERE { ?s a ds:Component }" --llm',
      ],
    },
    execute: async (
      params: Record<string, unknown>,
    ): Promise<CommandResult> => {
      const sparql = params.sparql as string;
      if (!sparql) {
        throw PragmaError.invalidInput("sparql", "(empty)", {
          recovery: {
            message: "Provide a SPARQL query string.",
          },
        });
      }

      const result = await executeQuery(ctx.store, sparql);

      return createOutputResult(result, {
        plain: selectFormatter(ctx, queryFormatters),
      });
    },
  };
}
