import composeClause from "./composeClause.js";

/**
 * A reason as an English sentence of its own: capitalised, with one full
 * stop whether or not the reason already ended in one. Schema, store and
 * source reasons are lowercase fragments.
 */
export default function composeSentence(reason: string): string {
  const clause = composeClause(reason);
  // By code point: a reason may open with a character outside the basic
  // plane, which `charAt` would cut in half.
  return `${clause.replace(/^./u, (first) => first.toUpperCase())}.`;
}
