import { PragmaError } from "#error";
import { describeFilters } from "../../shared/filters/index.js";
import type { FilterConfig } from "../../shared/types/index.js";

export default function blockEmptyError(
  filters: FilterConfig,
  allTiers: boolean,
  context: { unfilteredCount: number },
): PragmaError {
  const tierLabel = filters.tier ? `in tier "${filters.tier}"` : "";
  const hasHiddenItems = context.unfilteredCount > 0;

  const message = hasHiddenItems
    ? `No blocks found ${tierLabel}. ${context.unfilteredCount} block(s) available across all tiers.`
    : "No blocks found. Ensure design system packages are installed: bun add -D @canonical/design-system";

  return PragmaError.emptyResults("block", {
    filters: describeFilters(filters),
    message,
    recovery:
      !allTiers && hasHiddenItems
        ? {
            message: "Widen the search to show all tiers.",
            cli: "pragma block list --all-tiers",
            mcp: { tool: "block_list", params: { allTiers: true } },
          }
        : undefined,
  });
}
