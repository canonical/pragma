/**
 * `pragma graph inspect` command definition.
 */

import {
  type CommandDefinition,
  type CommandResult,
  createOutputResult,
} from "@canonical/cli-core";
import { PragmaError } from "#error";
import type { PragmaContext } from "../../shared/context.js";
import { selectFormatter } from "../../shared/formatters.js";
import { inspectFormatters } from "../formatters/index.js";
import { inspectUri } from "../operations/index.js";

export default function buildInspectCommand(
  ctx: PragmaContext,
): CommandDefinition {
  return {
    path: ["graph", "inspect"],
    description: "Inspect a URI in the knowledge graph",
    parameters: [
      {
        name: "uri",
        description: "URI to inspect (full or prefixed, e.g. 'ds:Button')",
        type: "string",
        positional: true,
        required: true,
      },
    ],
    meta: {
      examples: [
        "pragma graph inspect ds:Button",
        "pragma graph inspect https://ds.canonical.com/Button --llm",
      ],
    },
    execute: async (
      params: Record<string, unknown>,
    ): Promise<CommandResult> => {
      const uri = params.uri as string;
      if (!uri) {
        throw PragmaError.invalidInput("uri", "(empty)", {
          recovery: {
            message: "Provide a URI to inspect.",
            cli: "pragma graph query 'SELECT ?s WHERE { ?s ?p ?o } LIMIT 10'",
            mcp: { tool: "graph_query" },
          },
        });
      }

      const result = await inspectUri(ctx.store, uri);

      return createOutputResult(result, {
        plain: selectFormatter(ctx, inspectFormatters),
      });
    },
  };
}
