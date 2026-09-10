/**
 * Read the variables an author's SELECT clause projects, in the order it
 * projects them.
 *
 * Needed because a story's declared filters now compile into a WRAPPING select
 * ({@link ./buildListQuery.buildListQuery}), and the wrapper has to project the
 * same names in the same order the author did. `SELECT *` in the wrapper does
 * not: the store returns binding keys alphabetically, so `block list`'s rows
 * would go from `{uri,name,type,tier}` to `{name,tier,type,uri}` and every
 * `--format json` answer would change shape for no reason a caller asked for.
 *
 * The store cannot answer this. `SelectResult.variables` is derived from the
 * rows that came back, not from the query's header — over the shipped pack
 * `block list` reports four of its five variables, because the fifth is
 * unbound on the first row. So the projection is read from the query TEXT,
 * which is the only place that states it.
 *
 * This is a projection-clause reader, not a SPARQL parser. It handles what the
 * grammar admits in a SELECT clause — bare variables, and `(expr AS ?var)`
 * whatever the expression contains — and answers `undefined` for `SELECT *`,
 * which it cannot enumerate. A filterable list that projects `*` is refused at
 * declaration time rather than guessed at (see {@link ../schema}).
 */

/** A SPARQL variable name as this reader recognises it (`?name`, `$name`). */
const VARIABLE = /^[?$]([A-Za-z_][A-Za-z0-9_]*)/;

/** The `AS ?var` binding that names an expression's result. */
const ALIAS = /\bAS\s+[?$]([A-Za-z_][A-Za-z0-9_]*)\s*$/i;

/**
 * The variables a query's SELECT clause projects, in author order.
 *
 * @param query - The author's SPARQL SELECT text.
 * @returns The projected variable names (without `?`), or `undefined` for
 *   `SELECT *` and for text carrying no readable SELECT clause.
 */
export function readProjection(query: string): readonly string[] | undefined {
  const start = query.search(/\bSELECT\b/i);
  if (start === -1) return undefined;
  let index = start + "SELECT".length;
  const projected: string[] = [];
  while (index < query.length) {
    const rest = query.slice(index);
    const space = rest.match(/^\s+/);
    if (space) {
      index += space[0].length;
      continue;
    }
    // The clause ends at the WHERE keyword or at the group graph pattern's
    // brace, whichever the author wrote (`WHERE` is optional in SPARQL).
    if (/^(?:WHERE\b|\{)/i.test(rest)) break;
    // DISTINCT/REDUCED sit between the keyword and the projection.
    const modifier = rest.match(/^(?:DISTINCT|REDUCED)\b/i);
    if (modifier) {
      index += modifier[0].length;
      continue;
    }
    if (rest.startsWith("*")) return undefined;
    const variable = rest.match(VARIABLE);
    if (variable?.[1]) {
      projected.push(variable[1]);
      index += variable[0].length;
      continue;
    }
    if (rest.startsWith("(")) {
      const end = matchingParen(query, index);
      if (end === -1) return undefined;
      const alias = query.slice(index + 1, end).match(ALIAS);
      if (!alias?.[1]) return undefined;
      projected.push(alias[1]);
      index = end + 1;
      continue;
    }
    // Anything else in a projection clause is a shape this reader does not
    // claim to understand; saying so beats projecting a partial list.
    return undefined;
  }
  return projected.length > 0 ? projected : undefined;
}

/**
 * The index of the `)` closing the `(` at {@link open}, or -1 when unbalanced.
 *
 * Depth-counted rather than regex-matched: a projection expression nests
 * (`(COALESCE(IF(…), 0) AS ?rank)`), and the first `)` is rarely the right one.
 * Quoted strings are skipped so a `)` inside a literal cannot close the
 * expression.
 */
function matchingParen(query: string, open: number): number {
  let depth = 0;
  for (let index = open; index < query.length; index += 1) {
    const char = query[index];
    if (char === '"' || char === "'") {
      index = skipLiteral(query, index);
      continue;
    }
    if (char === "(") depth += 1;
    if (char === ")") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

/** The index of the quote closing the literal opened at {@link open}. */
function skipLiteral(query: string, open: number): number {
  const quote = query[open];
  for (let index = open + 1; index < query.length; index += 1) {
    if (query[index] === "\\") {
      index += 1;
      continue;
    }
    if (query[index] === quote) return index;
  }
  return query.length;
}
