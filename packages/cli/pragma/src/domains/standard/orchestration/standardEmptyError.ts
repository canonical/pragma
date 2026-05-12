import { PragmaError } from "#error";
import type { StandardListFilters } from "../../shared/types/index.js";

export default function standardEmptyError(
  filters: StandardListFilters,
  context: { unfilteredCount: number; availableCategories?: string[] },
): PragmaError {
  const active: Record<string, string> = {};
  if (filters.category) active.category = filters.category;
  if (filters.search) active.search = filters.search;

  const hasFilters = Object.keys(active).length > 0;
  const hasHiddenItems = context.unfilteredCount > 0;

  let message = "No standards found.";
  if (filters.category && hasHiddenItems) {
    message = `No standards found for category "${filters.category}". ${context.unfilteredCount} standard(s) available without the category filter.`;
  } else if (filters.category && context.availableCategories?.length) {
    message = `No standards found for category "${filters.category}". Available categories: ${context.availableCategories.join(", ")}.`;
  } else if (filters.search && hasHiddenItems) {
    message = `No standards matching "${filters.search}". ${context.unfilteredCount} standard(s) available without the search filter.`;
  }

  return PragmaError.emptyResults("standard", {
    message,
    filters: hasFilters ? active : undefined,
    validOptions: context.availableCategories,
    recovery: hasFilters
      ? {
          message: "List all standards without filters.",
          cli: "pragma standard list",
          mcp: { tool: "standard_list" },
        }
      : undefined,
  });
}
