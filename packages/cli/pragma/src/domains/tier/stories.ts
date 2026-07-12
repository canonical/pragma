/**
 * Tier read story — the single declaration of `tier list` for both
 * surfaces.
 *
 * The story kernel compiles this into the CLI command and MCP tool,
 * so description, resolution, and rendering live here once.
 */

import { PragmaError } from "#error";
import { createListView } from "#tui";
import type { ColumnDef } from "../shared/contracts.js";
import type { ReadStory } from "../shared/stories/index.js";
import type { TierEntry } from "../shared/types/index.js";
import { listFormatters } from "./formatters/index.js";
import { listTiers } from "./operations/index.js";

const tierListColumns: readonly ColumnDef<TierEntry>[] = [
  { key: "uri", label: "IRI" },
  { key: "path", label: "Path" },
  { key: "parent", label: "Parent" },
];

/** The `tier list` / `tier_list` read story. */
export const tierListStory: ReadStory<TierEntry[], TierEntry[]> = {
  noun: "tier",
  verb: "list",
  description: "List all tiers in the design system ontology",
  toolDescription:
    "List all tiers in the design system ontology with hierarchy.",
  params: [],
  examples: ["pragma tier list", "pragma tier list --llm"],
  resolve: (rt) => listTiers(rt.store),
  toOutput: (tiers) => tiers,
  formatters: listFormatters,
  toEnvelope: (tiers) => ({ data: tiers, meta: { count: tiers.length } }),
  emptyError: (tiers) =>
    tiers.length === 0
      ? PragmaError.emptyResults("tier", {
          recovery: {
            message:
              "Ensure semantic packages are resolvable — run `pragma doctor` to inspect package refs.",
          },
        })
      : undefined,
  renderInk: (tiers) =>
    createListView({
      heading: "Tiers",
      domain: "tier",
      items: tiers,
      columns: tierListColumns,
    }),
};
