/**
 * Modifier read stories — the single declaration of `modifier list` and
 * `modifier lookup` for both surfaces.
 *
 * The story kernel compiles these into the CLI commands and MCP tools,
 * so descriptions, parameters, resolution, and rendering live here once.
 */

import { createListView, createLookupView } from "#tui";
import type { LookupStory, ReadStory } from "../shared/stories/index.js";
import type { ModifierFamily } from "../shared/types/index.js";
import {
  createInkLookupOptions,
  listFormatters,
  lookupFormatters,
} from "./formatters/index.js";
import { modifierConfig } from "./modifierConfig.js";
import {
  resolveModifierList,
  resolveModifierLookup,
} from "./orchestration/index.js";
import type { ModifierListResolution } from "./types.js";

/** The `modifier list` / `modifier_list` read story. */
export const modifierListStory: ReadStory<
  ModifierListResolution,
  ModifierFamily[]
> = {
  noun: "modifier",
  verb: "list",
  description: "List all modifier families",
  toolDescription: "List all modifier families with their values.",
  params: [],
  examples: ["pragma modifier list", "pragma modifier list --llm"],
  resolve: (rt) => resolveModifierList(rt),
  toOutput: (resolution) => [...resolution.items],
  formatters: listFormatters,
  toEnvelope: (resolution) => ({
    data: resolution.items,
    meta: { count: resolution.items.length },
  }),
  renderInk: (items) =>
    createListView({
      heading: "Modifiers",
      domain: "modifier",
      items,
      columns: modifierConfig.listColumns,
    }),
};

/** The `modifier lookup` / `modifier_lookup` read story. */
export const modifierLookupStory: LookupStory<ModifierFamily, ModifierFamily> =
  {
    noun: "modifier",
    description: "Look up a modifier family and its values",
    toolDescription: "Get one or more modifier families and their values.",
    namesDescription: "Modifier family names or IRIs",
    namesToolDescription: "Modifier family names or IRIs to look up",
    examples: [
      "pragma modifier lookup importance",
      "pragma modifier lookup importance density",
      "pragma modifier lookup importance --llm",
    ],
    resolve: async (rt, names) => {
      const contract = await resolveModifierLookup(rt.store, names);
      return contract.result;
    },
    toFmtInput: (family) => family,
    formatters: lookupFormatters,
    renderInk: (result) =>
      createLookupView({
        results: result.results,
        errors: result.errors,
        domain: "modifier",
        options: createInkLookupOptions(),
      }),
  };
