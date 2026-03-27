import type { StandardListFilters } from "../../shared/types/index.js";

export default function buildStandardFilters(params: {
  category?: string;
  search?: string;
}): StandardListFilters {
  return {
    category: params.category,
    search: params.search,
  };
}
