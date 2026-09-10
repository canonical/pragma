/**
 * Read a list story's author query as the three parts a page has to keep apart:
 * the PROLOGUE it declares, the VARIABLES it projects, and the BODY a wrapping
 * select can hold.
 *
 * Every list answer is one page now, and a page is a wrapping select over the
 * story's own query ({@link ./buildListQuery.buildListQuery}). Three properties
 * of the author's text decide whether that wrap is legal, and none of them can
 * be asked of the store:
 *
 * - **The prologue cannot be wrapped.** `PREFIX` and `BASE` belong to a QUERY;
 *   a group graph pattern admits only patterns, so splicing author text that
 *   opens with `PREFIX` inside one is a parse error (`expected OPTIONAL`). The
 *   declarations are lifted to the wrapper's own prologue instead, in order, and
 *   the body from the `SELECT` keyword on is what gets wrapped.
 * - **The projection has to be reproduced.** `SELECT *` in the wrapper hands
 *   back alphabetised binding keys, so `block list`'s rows would go from
 *   `{uri,name,type,tier}` to `{name,tier,type,uri}` and every `--format json`
 *   answer would change shape for no reason a caller asked for. The store cannot
 *   answer this either: `SelectResult.variables` is derived from the rows that
 *   came back, not from the query's header — over the shipped pack `block list`
 *   reports four of its five, because the fifth is unbound on the first row. So
 *   the projection is read from the query TEXT, which is the only place that
 *   states it. An author who wrote `SELECT *` is wrapped with `SELECT *`, which
 *   preserves their key order because it is the same alphabetisation twice.
 * - **A dataset clause cannot be wrapped either.** `FROM` sits between the
 *   select clause and the where clause, and `SubSelect` has no place for it. It
 *   is REFUSED rather than lifted, because lifting it would mean cutting a span
 *   out of the middle of the author's text — the prologue is a prefix, which is
 *   why lifting that one is a split and not an edit.
 *
 * This is a lexer for the two clauses that precede the where clause, not a
 * SPARQL parser. It covers the whole grammar of both — `Prologue ::= (BaseDecl
 * | PrefixDecl)*` and `SelectClause ::= 'SELECT' ('DISTINCT'|'REDUCED')?
 * ((Var | '(' Expression 'AS' Var ')')+ | '*')` — and it skips comments and
 * string literals everywhere it scans, so a `#` inside a prefix IRI, a `# select
 * the blocks` heading, and a `WHERE {` inside a `REPLACE` literal are all read
 * as what they are. What it cannot read it says it cannot read, naming the
 * shape it found: a refusal that misdiagnoses sends the author to the wrong
 * file.
 */

/** A SPARQL variable as this reader recognises it (`?name`, `$name`). */
const VARIABLE = /^[?$]([A-Za-z_][A-Za-z0-9_]*)/;

/** The `AS ?var` binding that names a projection expression's result. */
const ALIAS = /\bAS\s+[?$]([A-Za-z_][A-Za-z0-9_]*)\s*$/i;

/** Whitespace and `#` comments, which may sit between any two tokens. */
const IGNORABLE = /^(?:\s+|#[^\n\r]*)+/;

/** `PNAME_NS ::= PN_PREFIX? ':'` — the name a `PREFIX` declaration binds. */
const PREFIX_NAME = /^[A-Za-z][\w.-]*:|^:/;

/** An author query split where a wrapping select can take it over. */
export interface AuthorQuery {
  /**
   * The author's own `PREFIX`/`BASE` declarations, verbatim and in order, or
   * `""` when there are none. Emitted as the WRAPPER's prologue.
   */
  readonly prologue: string;
  /**
   * The projected variables (without `?`), in author order — or `undefined`
   * for `SELECT *`, which names no variables to reproduce.
   */
  readonly projection: readonly string[] | undefined;
  /** The query from its `SELECT` keyword on: what a sub-select can hold. */
  readonly body: string;
}

/** A read of an author query: the parts, or what stopped the reader. */
export type AuthorQueryRead =
  | { readonly ok: true; readonly query: AuthorQuery }
  | { readonly ok: false; readonly reason: string };

/**
 * Split an author query into its prologue, its projection and its body.
 *
 * @param text - The author's SPARQL SELECT text.
 * @returns The three parts, or the reason the text cannot be wrapped — a
 *   sentence fragment naming what the reader FOUND, for a caller to quote.
 */
export function readAuthorQuery(text: string): AuthorQueryRead {
  const prologue = readPrologue(text);
  const start = skipIgnorable(text, prologue.end);
  if (!/^SELECT\b/i.test(text.slice(start))) {
    return { ok: false, reason: "its text declares no SPARQL SELECT" };
  }
  const clause = readSelectClause(text, start + "SELECT".length);
  if (!clause.ok) return clause;
  return {
    ok: true,
    query: {
      prologue: text.slice(prologue.start, prologue.end),
      projection: clause.projection,
      body: text.slice(start),
    },
  };
}

/** Where the prologue's declarations begin and end (equal when there are none). */
function readPrologue(text: string): { start: number; end: number } {
  const start = skipIgnorable(text, 0);
  let end = start;
  let at = start;
  for (;;) {
    const declaration = readDeclaration(text, at);
    if (declaration === undefined) return { start, end };
    end = declaration;
    at = skipIgnorable(text, declaration);
  }
}

/**
 * The index just past one `PREFIX`/`BASE` declaration, or `undefined` when the
 * text at {@link at} is not one.
 *
 * The IRI is scanned to its closing `>`, which is exact: `IRIREF` excludes `>`
 * from its character class, so the first one closes it — and it does NOT
 * exclude `#`, which is why a comment-aware scan has to read the IRI as an IRI
 * rather than skip to end of line.
 */
function readDeclaration(text: string, at: number): number | undefined {
  const keyword = text.slice(at).match(/^(BASE|PREFIX)\b/i);
  if (!keyword?.[1]) return undefined;
  let index = skipIgnorable(text, at + keyword[0].length);
  if (keyword[1].toUpperCase() === "PREFIX") {
    const name = text.slice(index).match(PREFIX_NAME);
    if (!name) return undefined;
    index = skipIgnorable(text, index + name[0].length);
  }
  if (text[index] !== "<") return undefined;
  const close = text.indexOf(">", index + 1);
  return close === -1 ? undefined : close + 1;
}

/** Read the select clause that starts just past the `SELECT` keyword. */
function readSelectClause(
  text: string,
  from: number,
):
  | { readonly ok: true; readonly projection: readonly string[] | undefined }
  | { readonly ok: false; readonly reason: string } {
  const projected: string[] = [];
  let star = false;
  let at = from;
  while (at < text.length) {
    at = skipIgnorable(text, at);
    const rest = text.slice(at);
    // The clause ends at the WHERE keyword or at the group graph pattern's
    // brace, whichever the author wrote (`WHERE` is optional in SPARQL).
    if (rest === "" || /^(?:WHERE\b|\{)/i.test(rest)) break;
    if (/^FROM\b/i.test(rest)) {
      return {
        ok: false,
        reason:
          "it carries a FROM dataset clause, and a sub-select cannot carry one",
      };
    }
    // DISTINCT/REDUCED sit between the keyword and the projection.
    const modifier = rest.match(/^(?:DISTINCT|REDUCED)\b/i);
    if (modifier && projected.length === 0 && !star) {
      at += modifier[0].length;
      continue;
    }
    if (rest.startsWith("*")) {
      star = true;
      at += 1;
      continue;
    }
    const variable = rest.match(VARIABLE);
    if (variable?.[1]) {
      projected.push(variable[1]);
      at += variable[0].length;
      continue;
    }
    if (rest.startsWith("(")) {
      const end = matchingParen(text, at);
      const alias = end === -1 ? null : text.slice(at + 1, end).match(ALIAS);
      if (!alias?.[1]) {
        return {
          ok: false,
          reason:
            "its SELECT clause carries a parenthesised expression that names no result variable (`(… AS ?name)`)",
        };
      }
      projected.push(alias[1]);
      at = end + 1;
      continue;
    }
    return {
      ok: false,
      reason: `its SELECT clause carries ${quoted(rest)}, which is neither a variable nor an \`(expression AS ?variable)\``,
    };
  }
  if (star) {
    return projected.length === 0
      ? { ok: true, projection: undefined }
      : {
          ok: false,
          reason: "its SELECT clause mixes `*` with named variables",
        };
  }
  return projected.length > 0
    ? { ok: true, projection: projected }
    : { ok: false, reason: "its SELECT clause projects nothing" };
}

/** The first token of {@link rest}, quoted short enough to read in a message. */
function quoted(rest: string): string {
  const token = rest.match(/^\S{1,24}/)?.[0] ?? rest.slice(0, 24);
  return `"${token}"`;
}

/** Whitespace and comments consumed: the next index that is neither. */
function skipIgnorable(text: string, at: number): number {
  const skip = text.slice(at).match(IGNORABLE);
  return skip ? at + skip[0].length : at;
}

/**
 * The index of the `)` closing the `(` at {@link open}, or -1 when unbalanced.
 *
 * Depth-counted rather than regex-matched: a projection expression nests
 * (`(COALESCE(IF(…), 0) AS ?rank)`), and the first `)` is rarely the right one.
 * Quoted strings are skipped so a `)` inside a literal cannot close the
 * expression.
 */
function matchingParen(text: string, open: number): number {
  let depth = 0;
  for (let index = open; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"' || char === "'") {
      index = skipLiteral(text, index);
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
function skipLiteral(text: string, open: number): number {
  const quote = text[open];
  for (let index = open + 1; index < text.length; index += 1) {
    if (text[index] === "\\") {
      index += 1;
      continue;
    }
    if (text[index] === quote) return index;
  }
  return text.length;
}
