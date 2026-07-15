/**
 * Bundled transitional `tier` pack.
 *
 * Replaces the hand-written `tier` domain (~179 LOC of command/operation/
 * formatter/MCP wiring) with a declarative list story. `tier list` and the
 * `tier_list` MCP tool are compiled from this definition through the same
 * kernel as every other pack, so the CLI core stops carrying tier-specific
 * TypeScript.
 *
 * @remarks transitional — this ships inside pragma today; in P4 it moves into
 * the `@canonical/design-system` package as `stories/tier.json` alongside that
 * package's prefix declaration, at which point the core carries no tier at all.
 *
 * Scope note: the old domain's `TierEntry.depth`/`parent` fields were always
 * `0`/absent — tier hierarchy is encoded in the slash-separated *path string*
 * (`apps/lxd`), not in graph edges, and the ordered-inheritance logic lives in
 * `buildTierFilter`/`resolveTierChain` (a filter primitive other domains use).
 * `tier list` is therefore a flat, name-ordered list, which this pack
 * reproduces faithfully; there is no graph tree to project.
 */

import type { StoryPackDefinition } from "../types.js";

/**
 * The `tier` list story as data.
 *
 * The SELECT binds the tier IRI to `uri` and its `ds:name` to `name` (the
 * honest mapping of the `ds:name` property), so `--format json` is the uniform
 * `{uri, name}` pack shape and the generic renderer emits `- ` + "`ds:apps`" +
 * ` — **Apps**` in llm mode. The store injects PREFIX declarations, so `ds:`
 * resolves against the merged prefix map. The old domain's always-zero
 * `depth` field is intentionally dropped.
 */
export const tierPack: StoryPackDefinition = {
  noun: "tier",
  description: "List all tiers in the design system ontology",
  toolDescription: "List all tiers in the design-system ontology.",
  list: {
    query: [
      "SELECT ?uri ?name WHERE {",
      "  ?uri a ds:Tier ;",
      "       ds:name ?name .",
      "} ORDER BY ?name",
    ].join("\n"),
    columns: [
      { field: "uri", label: "IRI" },
      { field: "name", label: "Name" },
    ],
  },
};
