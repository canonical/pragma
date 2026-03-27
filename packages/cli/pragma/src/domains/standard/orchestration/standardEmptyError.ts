import { PragmaError } from "#error";
import type { StandardListFilters } from "../../shared/types/index.js";

export default function standardEmptyError(
  filters: StandardListFilters,
): PragmaError {
  const active: Record<string, string> = {};
  if (filters.category) active.category = filters.category;
  if (filters.search) active.search = filters.search;

  return PragmaError.emptyResults("standard", {
    filters: Object.keys(active).length > 0 ? active : undefined,
    recovery: {
      message: "List all standards without filters.",
      cli: "pragma standard list",
      mcp: { tool: "standard_list" },
    },
  });
}
