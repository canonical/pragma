/**
 * Standard read stories — the single declaration of `standard list` and
 * `standard lookup` for both surfaces.
 *
 * The story kernel compiles these into the CLI commands and MCP tools,
 * so descriptions, parameters, resolution, and rendering live here once.
 */

import { createListView, createLookupView } from "#tui";
import type { LookupStory, ReadStory } from "../shared/stories/index.js";
import type { StandardDetailed } from "../shared/types/index.js";
import {
  createInkLookupOptions,
  listFormatters,
  lookupFormatters,
  type StandardListOutput,
  type StandardLookupInput,
} from "./formatters/index.js";
import {
  resolveStandardList,
  resolveStandardLookup,
} from "./orchestration/index.js";
import { standardConfig } from "./standardConfig.js";
import type { StandardListResolution } from "./types.js";

/** The `standard list` / `standard_list` read story. */
export const standardListStory: ReadStory<
  StandardListResolution,
  StandardListOutput
> = {
  noun: "standard",
  verb: "list",
  description: "List all code standards",
  toolDescription:
    "List code standards. Optionally filter by category or search term. Use digest/detailed for progressive disclosure.",
  params: [
    {
      name: "category",
      type: "string",
      description: "Filter by category",
      toolDescription: "Filter by category name",
    },
    {
      name: "search",
      type: "string",
      description: "Search in name and description",
    },
    {
      name: "digest",
      type: "boolean",
      description: "Show description and first example for each standard",
      default: false,
    },
    {
      name: "detailed",
      type: "boolean",
      description: "Show full dos/donts for each standard",
      default: false,
    },
  ],
  examples: [
    "pragma standard list",
    "pragma standard list --category react",
    'pragma standard list --search "folder"',
    "pragma standard list --digest",
    "pragma standard list --detailed",
    "pragma standard list --llm",
  ],
  resolve: (rt, params) =>
    resolveStandardList(rt, {
      category: params.category as string | undefined,
      search: params.search as string | undefined,
      digest: params.digest === true,
      detailed: params.detailed === true,
    }),
  toOutput: (resolution) => ({
    items: resolution.items,
    details: resolution.details,
    disclosure: resolution.disclosure,
  }),
  formatters: listFormatters,
  toEnvelope: (resolution) => {
    if (resolution.disclosure.level === "summary") {
      return {
        data: resolution.items,
        meta: { count: resolution.items.length },
      };
    }
    const output: StandardListOutput = {
      items: resolution.items,
      details: resolution.details,
      disclosure: resolution.disclosure,
    };
    return {
      data: JSON.parse(listFormatters.json(output)),
      meta: {
        count: resolution.items.length,
        disclosure: resolution.disclosure.level,
      },
    };
  },
  renderInk: (output) =>
    createListView({
      heading: "Standards",
      domain: "standard",
      items: output.items,
      columns: standardConfig.listColumns,
    }),
};

/** The `standard lookup` / `standard_lookup` read story. */
export const standardLookupStory: LookupStory<
  StandardDetailed,
  StandardLookupInput
> = {
  noun: "standard",
  description: "Look up detailed information for a standard by name or IRI",
  toolDescription:
    "Get detailed information about one or more code standards including dos and donts with code examples.",
  namesDescription: "Standard names or IRIs",
  namesToolDescription: "Standard names or IRIs to look up",
  detailedParam: {
    description: "Include dos and donts with code blocks",
    toolDescription:
      "Return full details with dos/donts (default: true for MCP)",
  },
  examples: [
    "pragma standard lookup react/component/folder-structure",
    "pragma standard lookup react/component/folder-structure react/component/props",
    "pragma standard lookup react/component/folder-structure --detailed",
    "pragma standard lookup react/component/folder-structure --llm",
    "pragma standard lookup cs:react_props",
  ],
  resolve: async (rt, names) => {
    const contract = await resolveStandardLookup(rt.store, names);
    return contract.result;
  },
  toFmtInput: (standard, view) => ({ standard, detailed: view.detailed }),
  formatters: lookupFormatters,
  project: (standard) => {
    const { uri, name, category, description } = standard;
    return { uri, name, category, description };
  },
  renderInk: (result, view) =>
    createLookupView({
      results: result.results,
      errors: result.errors,
      domain: "standard",
      options: createInkLookupOptions(view.detailed),
    }),
};
