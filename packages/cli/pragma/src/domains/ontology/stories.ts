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
import type { OntologyShowInput } from "./formatters/index.js";
import { listFormatters, showFormatters } from "./formatters/index.js";
import expandOntologyIris from "./helpers/expandOntologyIris.js";
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
export const ontologyShowStory: ReadStory<OntologyDetailed, OntologyShowInput> =
  {
    noun: "ontology",
    verb: "show",
    description: "Show ontology schema details",
    toolDescription:
      "Show the TBox for a namespace: class hierarchy with instance counts and relations, plus metadata and constraints.",
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
      {
        name: "class",
        type: "string",
        description:
          "Deep-dive into one class (label, local name, or compact IRI)",
        toolDescription:
          "Class to deep-dive into: super chain, direct + inherited properties, reverse references, sample instances, and follow-up queries",
      },
      {
        name: "properties",
        type: "boolean",
        description:
          "Include datatype properties (attributes); default shows relations only",
      },
      {
        name: "fullUris",
        type: "boolean",
        description: "Show full URIs instead of compact prefixed IRIs",
      },
    ],
    examples: [
      "pragma ontology show ds",
      "pragma ontology show ds --properties",
      "pragma ontology show ds --full-uris --format json",
      "pragma ontology show ds --class Component",
    ],
    resolve: (rt, params) =>
      showOntology(rt.store, params.prefix as string, {
        class: params.class as string | undefined,
      }),
    // --full-uris is applied here, once, so every projection (plain, llm,
    // json, MCP condensed) inherits the same encoding from the same place.
    toOutput: (ontology, params) => ({
      ontology: params.fullUris ? expandOntologyIris(ontology) : ontology,
      showProperties: Boolean(params.properties),
    }),
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
