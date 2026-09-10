/**
 * Read a list story's free-text search argument.
 *
 * The comparison itself compiles into the query
 * ({@link ./buildListQuery.buildListQuery}); what stays here is the reading of
 * the argument — NFC-normalised and trimmed, with a non-string or empty term a
 * no-op rather than a predicate that matches everything. Normalising on this
 * side is the whole of it: the store has no normaliser, so the graph's own
 * spelling is compared as it is stored.
 */

import type { PackSearch } from "../types.js";
import type { ListSearch } from "./buildListQuery.js";

/**
 * @param search - The declared search (absent means the story has none).
 * @param params - Story parameters as provided by the surface.
 * @returns The search to compile, or `undefined` when there is nothing to search for.
 */
export function readSearchTerm(
  search: PackSearch | undefined,
  params: Record<string, unknown>,
): ListSearch | undefined {
  const provided = params.search;
  if (search === undefined || typeof provided !== "string") return undefined;
  const term = provided.trim().normalize("NFC");
  if (term === "") return undefined;
  return { variables: search.variables, term };
}
