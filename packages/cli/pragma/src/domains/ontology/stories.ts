/**
 * Ontology read stories — the single declaration of `ontology list` and
 * `ontology show` for both surfaces.
 *
 * The story kernel compiles these into the CLI commands and MCP tools.
 * Both surfaces now render through the same formatters, so MCP condensed
 * output matches CLI `--llm` output by construction (previously the MCP
 * specs re-implemented the Markdown inline and had drifted).
 */

import { PragmaError } from "#error";
import { createListView } from "#tui";
import type { ColumnDef } from "../shared/contracts.js";
import {
  type ReadStory,
  requirePragmaContext,
} from "../shared/stories/index.js";
import type {
  OntologyDetailed,
  OntologySummary,
} from "../shared/types/index.js";
import { listFormatters, showFormatters } from "./formatters/index.js";
import { listOntologies, showOntology } from "./operations/index.js";

const ontologyListColumns: readonly ColumnDef<OntologySummary>[] = [
  { key: "prefix", label: "Prefix" },
  { key: "namespace", label: "Namespace" },
  { key: "classCount", label: "Classes" },
  { key: "propertyCount", label: "Properties" },
  { key: "anatomyCount", label: "Anatomies" },
];

/** The `ontology list` / `ontology_list` read story. */
export const ontologyListStory: ReadStory<
  OntologySummary[],
  readonly OntologySummary[]
> = {
  noun: "ontology",
  verb: "list",
  description: "List loaded ontologies",
  toolDescription:
    "List all ontologies loaded in the knowledge graph with class and property counts.",
  params: [],
  examples: ["pragma ontology list", "pragma ontology list --llm"],
  resolve: (rt) => listOntologies(rt.store),
  toOutput: (ontologies) => ontologies,
  formatters: listFormatters,
  toEnvelope: (ontologies) => ({
    data: ontologies,
    meta: { count: ontologies.length },
  }),
  emptyError: (ontologies) =>
    ontologies.length === 0
      ? PragmaError.emptyResults("ontology", {
          recovery: {
            message: "Ensure design system packages are installed.",
          },
        })
      : undefined,
  renderInk: (ontologies) =>
    createListView({
      heading: "Ontologies",
      domain: "ontology",
      items: ontologies,
      columns: ontologyListColumns,
    }),
};

/** The `ontology show <prefix>` / `ontology_show` read story. */
export const ontologyShowStory: ReadStory<OntologyDetailed, OntologyDetailed> =
  {
    noun: "ontology",
    verb: "show",
    description: "Show ontology schema details",
    toolDescription:
      "Show detailed schema for an ontology including classes and properties.",
    params: [
      {
        name: "prefix",
        type: "string",
        description: "Ontology prefix (e.g. 'ds', 'cs')",
        positional: true,
        required: true,
        complete: async (partial, cmdCtx) => {
          const ctx = requirePragmaContext(cmdCtx);
          const all = await listOntologies(ctx.store);
          return all
            .map((o) => o.prefix)
            .filter((p) => p.toLowerCase().startsWith(partial.toLowerCase()));
        },
      },
    ],
    examples: ["pragma ontology show ds", "pragma ontology show cs --llm"],
    resolve: (rt, params) => showOntology(rt.store, params.prefix as string),
    toOutput: (ontology) => ontology,
    formatters: showFormatters,
    toEnvelope: (ontology) => ({ data: ontology }),
    guardParams: (params) =>
      typeof params.prefix === "string" && params.prefix.length > 0
        ? undefined
        : PragmaError.invalidInput("prefix", "(empty)", {
            recovery: {
              message: "List loaded ontologies to find valid prefixes.",
              cli: "pragma ontology list",
              mcp: { tool: "ontology_list" },
            },
          }),
  };
