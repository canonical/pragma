import { markAsURI } from "./sparql.js";
import type { URI } from "./types.js";

/**
 * Creates a namespace helper that produces typed URI terms (TP.06).
 *
 * @example
 * ```ts
 * const schema = namespace("http://schema.org/");
 * const name = schema("name"); // URI: "http://schema.org/name"
 * ```
 */
export function namespace<NS extends string>(
  ns: NS,
): <T extends string>(term: T) => URI {
  return <T extends string>(term: T): URI => {
    return markAsURI(`${ns}${term}`);
  };
}
