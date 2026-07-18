import type { PromptDefinition } from "../types.js";

/**
 * CORE prompt: diagnose zero-result lists and lookups (D6).
 *
 * The recovery wording deliberately matches the zero-results error hint
 * the pack lists throw (`EMPTY_RESULTS` + `allTiers` recovery) — keep the
 * two aligned when editing either.
 */
export const fixEmptyResultsPrompt: PromptDefinition = {
  name: "fix-empty-results",
  description:
    "Diagnose a list or lookup that returned zero results. Use when a " +
    "query you expected to match comes back empty: walks the tier/channel " +
    "filters and the per-call overrides that bypass them.",
  template: [
    "A pragma list or lookup returned zero results. Work through these in order:",
    "",
    "1. Check the active scope below — a set tier filters lists to its tier chain, and the channel hides entities whose release status is not visible on it.",
    "2. Retry with the per-call override: allTiers: true (MCP) or --all-tiers (CLI). This bypasses the tier filter for one call without changing config.",
    "3. If a param filter (category, search, …) was active, retry without it to separate 'filtered out' from 'not there'.",
    "4. Still empty? The data family may live in a package that is not loaded — compare the packages below with what you expect (pragma info · doctor).",
    "5. To durably widen scope: config_tier { reset: true } · pragma config tier --reset (channel and the detail default work the same way).",
    "",
    "Prefer the per-call overrides over config_* mutations — config changes persist for the human too.",
  ].join("\n"),
  embed: [{ resource: "pragma://state", heading: "Active scope" }],
};
