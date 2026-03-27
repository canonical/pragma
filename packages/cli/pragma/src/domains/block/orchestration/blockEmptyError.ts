import { PragmaError } from "#error";
import { describeFilters } from "../../shared/filters/index.js";
import type { FilterConfig } from "../../shared/types/index.js";

export default function blockEmptyError(
  filters: FilterConfig,
  allTiers?: boolean,
): PragmaError {
  return PragmaError.emptyResults("block", {
    filters: describeFilters(filters),
    recovery: allTiers
      ? undefined
      : {
          message: "Widen the search to show all tiers.",
          cli: "pragma block list --all-tiers",
          mcp: { tool: "block_list", params: { allTiers: true } },
        },
  });
}
