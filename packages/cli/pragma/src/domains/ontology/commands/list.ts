import {
  type CommandDefinition,
  type CommandResult,
  createOutputResult,
} from "@canonical/cli-core";
import { PragmaError } from "#error";
import type { PragmaContext } from "../../shared/context.js";
import { selectFormatter } from "../../shared/formatters.js";
import { listFormatters } from "../formatters/index.js";
import { listOntologies } from "../operations/index.js";

/**
 * Builds the `pragma ontology list` command definition.
 *
 * Lists all loaded ontology namespaces with class and property counts.
 *
 * @param ctx - Pragma runtime context providing the ke store and config.
 * @returns A command definition for `ontology list`.
 */
export default function buildListCommand(
  ctx: PragmaContext,
): CommandDefinition {
  return {
    path: ["ontology", "list"],
    description: "List loaded ontologies",
    parameters: [],
    meta: {
      examples: ["pragma ontology list", "pragma ontology list --llm"],
    },
    execute: async (): Promise<CommandResult> => {
      const ontologies = await listOntologies(ctx.store);

      if (ontologies.length === 0) {
        throw PragmaError.emptyResults("ontology", {
          recovery: {
            message: "Ensure design system packages are installed.",
          },
        });
      }

      return createOutputResult(ontologies, {
        plain: selectFormatter(ctx, listFormatters),
      });
    },
  };
}
