import { PragmaError } from "#error";
import type { StandardListFilters } from "../../shared/types/index.js";

export default function standardEmptyError(
  filters: StandardListFilters,
): PragmaError {
  const active: Record<string, string> = {};
  if (filters.category) active.category = filters.category;
  if (filters.search) active.search = filters.search;
  const hasFilter = Object.keys(active).length > 0;

  return PragmaError.emptyResults("standard", {
    filters: hasFilter ? active : undefined,
    recovery: hasFilter
      ? {
          // Filter-narrowing: clear the active category/search and re-list.
          message: "List all standards without filters.",
          cli: "pragma standard list",
          mcp: { tool: "standard_list" },
        }
      : {
          // Store-empty with no filter active: suggesting `standard list`
          // again would just re-return empty, so route to the install.
          message:
            "Install the code standards packages that provide standards.",
          cli: "bun add -D @canonical/code-standards",
        },
  });
}
