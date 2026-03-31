import {
  type CommandDefinition,
  type CommandResult,
  createOutputResult,
} from "@canonical/cli-core";
import { PragmaError } from "#error";
import { createListView } from "#tui";
import type { PragmaContext } from "../../shared/context.js";
import type { ColumnDef } from "../../shared/contracts.js";
import { selectFormatter } from "../../shared/formatters.js";
import type { OntologySummary } from "../../shared/types/ontology.js";
import { listFormatters } from "../formatters/index.js";
import { listOntologies } from "../operations/index.js";

const ontologyListColumns: readonly ColumnDef<OntologySummary>[] = [
  { key: "prefix", label: "Prefix" },
  { key: "namespace", label: "Namespace" },
  { key: "classCount", label: "Classes" },
  { key: "propertyCount", label: "Properties" },
  { key: "anatomyCount", label: "Anatomies" },
];

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
        ink: (data) =>
          createListView({
            heading: "Ontologies",
            domain: "ontology",
            items: data,
            columns: ontologyListColumns,
          }),
      });
    },
  };
}
