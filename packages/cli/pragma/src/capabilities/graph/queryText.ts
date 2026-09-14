/**
 * Making the graph's OWN names typable in `graph query`, and making the
 * parser's complaint about the user's text.
 *
 * Two defects with one cause: the query a caller writes is not the query the
 * parser reads. `rt.query.sparql` prepends one `PREFIX` line per registered
 * namespace, so a caller's line 1 is the parser's line 16 — and the names the
 * rest of this CLI hands out (`ds:global.component.button` from `graph
 * inspect`, `dt:s4/web/--color-text` from `variable list`) are not spellable as
 * SPARQL `PN_LOCAL` at all. Pasting a name pragma itself printed produced a
 * Unicode-range dump pointing at a line the caller could not see.
 *
 * So this module owns both halves of the seam:
 *
 * - {@link expandPrefixedNames} rewrites a prefixed name whose local part the
 *   grammar cannot carry into the `<absolute IRI>` it stands for — the same
 *   expansion `graph inspect` has always done for its one argument, applied to
 *   every token of a query. It is a pure text transform: same namespaces, same
 *   meaning, so a query that already parsed answers exactly as before.
 * - {@link trimQueryError} reports the position in the CALLER's text and cuts
 *   the parser's expected-token dump to one line.
 */

import { isEmbeddableIri } from "../../kernel/packs/iri.js";

/**
 * The query's own `PREFIX` declarations. Captured (rather than merely detected)
 * because a caller who declares a prefix wins over the prepended one, so an
 * expansion has to use the namespace the parser would have used.
 */
const PREFIX_DECLARATION = /\bPREFIX\s+([A-Za-z][\w.-]*)?\s*:\s*<([^<>\s]*)>/gi;

/**
 * One pass over the query, in precedence order: comment, long literal, short
 * literal, IRI, prefixed-name candidate, any other character.
 *
 * The first four alternatives exist to be SKIPPED — a `ds:x/y` inside a string
 * literal is data the caller wrote, and inside `<…>` it is already an IRI.
 * Everything the scanner does not recognise passes through one character at a
 * time, which is what keeps an unparsable query byte-identical apart from the
 * names this module set out to expand.
 */
const SCANNER = new RegExp(
  [
    "#[^\\n]*", // comment to end of line
    '"""[\\s\\S]*?"""', // long literals
    "'''[\\s\\S]*?'''",
    '"(?:[^"\\\\\\n]|\\\\.)*"', // short literals
    "'(?:[^'\\\\\\n]|\\\\.)*'",
    '<[^<>"{}|^`\\\\\\s]*>', // an absolute IRI, already written out
    // A prefixed-name candidate: a name, a colon, and the longest run of
    // characters that could belong to a local part. `/` is included because
    // the token IRIs contain it (`dt:s4/web/--color-text`); a property path
    // is told apart from a local part in `splitPropertyPath`.
    "[A-Za-z_\\u00C0-\\uFFFF][\\w.\\-\\u00C0-\\uFFFF]*:[^\\s<>\"'`{}()\\[\\],;|^\\\\*+?!=&#@$]*",
    "[\\s\\S]", // anything else, one character at a time
  ].join("|"),
  "g",
);

/** A local part every SPARQL parser carries as written — left alone. */
const PLAIN_LOCAL = /^[A-Za-z0-9_][A-Za-z0-9_-]*$/;

/** What a rewrite did, so the caller can say how much of a position it trusts. */
export interface ExpandedQuery {
  /** The query to hand the parser. */
  readonly text: string;
  /** True when at least one name was rewritten (columns therefore moved). */
  readonly rewritten: boolean;
}

/**
 * Expand every prefixed name whose local part the SPARQL grammar cannot carry.
 *
 * Conservative in the direction that matters: a name is rewritten only when its
 * prefix is one the query will be parsed with, its local part is not a plain
 * name (letters, digits, `_`, `-`), and the expansion is a safe `<IRI>` token.
 * A name inside a string literal, a comment or an existing IRI is never
 * touched, and neither is a property path's operator (`ds:a/ds:b` stays two
 * steps, `dt:s4/web/--x` stays one name).
 *
 * @param sparql - The query as the caller wrote it.
 * @param prefixes - The namespaces the query will be parsed with.
 * @returns The query to execute, and whether anything moved.
 */
export function expandPrefixedNames(
  sparql: string,
  prefixes: Readonly<Record<string, string>>,
): ExpandedQuery {
  const namespaces = { ...prefixes, ...declaredPrefixes(sparql) };
  let rewritten = false;
  const text = sparql.replace(SCANNER, (token) => {
    const expanded = expandToken(token, namespaces);
    if (expanded === undefined) return token;
    rewritten = true;
    return expanded;
  });
  return { text, rewritten };
}

/** The prefixes the query declares for itself, which outrank the prepended ones. */
function declaredPrefixes(sparql: string): Record<string, string> {
  const declared: Record<string, string> = {};
  for (const match of sparql.matchAll(PREFIX_DECLARATION)) {
    declared[match[1] ?? ""] = match[2] ?? "";
  }
  return declared;
}

/**
 * One matched token, expanded — or `undefined` when it must be left as it is.
 *
 * The token may be a whole property path (`ds:a/ds:b`), because `/` is both the
 * path operator and a character in this graph's local names. The two are told
 * apart by what follows the slash: a segment that itself opens a KNOWN prefixed
 * name is the next step of a path, anything else (`s4/web/--color-text`) is
 * more of the same name. Each step is then expanded on its own, so a path may
 * be half rewritten and stay a path.
 *
 * @param token - The matched token (it may not be a prefixed name at all).
 * @param namespaces - Prefix → namespace, the caller's declarations winning.
 * @returns The rewritten token, or undefined to keep the original.
 */
function expandToken(
  token: string,
  namespaces: Readonly<Record<string, string>>,
): string | undefined {
  // Every alternative but the candidate one is skipped here: a comment, a
  // literal and an IRI all fail one of these guards.
  if (
    token.indexOf(":") <= 0 ||
    token.startsWith("<") ||
    token.startsWith("#")
  ) {
    return undefined;
  }
  let rewritten = false;
  const steps = pathSteps(token, namespaces).map((step) => {
    const expanded = expandName(step, namespaces);
    if (expanded === undefined) return step;
    rewritten = true;
    return expanded;
  });
  return rewritten ? steps.join("/") : undefined;
}

/** Split a token into the property-path steps it is made of (usually one). */
function pathSteps(
  token: string,
  namespaces: Readonly<Record<string, string>>,
): string[] {
  const segments = token.split("/");
  const steps: string[] = [];
  let step = segments[0] as string;
  for (const segment of segments.slice(1)) {
    const colon = segment.indexOf(":");
    if (colon > 0 && namespaces[segment.slice(0, colon)] !== undefined) {
      steps.push(step);
      step = segment;
    } else {
      step = `${step}/${segment}`;
    }
  }
  steps.push(step);
  return steps;
}

/**
 * One prefixed name, as the `<IRI>` it stands for — or `undefined` to keep it.
 *
 * @param name - One path step: `prefix:local`, plus any trailing punctuation.
 * @param namespaces - Prefix → namespace, the caller's declarations winning.
 * @returns The rewritten name, or undefined to keep the original.
 */
function expandName(
  name: string,
  namespaces: Readonly<Record<string, string>>,
): string | undefined {
  const colon = name.indexOf(":");
  if (colon <= 0) return undefined;
  const namespace = namespaces[name.slice(0, colon)];
  if (namespace === undefined) return undefined;
  // A local part may not END in a dot, so a trailing one is the statement
  // terminator the caller typed, not part of the name.
  const local = name.slice(colon + 1).replace(/\.+$/, "");
  const tail = name.slice(colon + 1 + local.length);
  if (local === "" || PLAIN_LOCAL.test(local)) return undefined;
  const iri = `${namespace}${local}`;
  return isEmbeddableIri(iri) ? `<${iri}>${tail}` : undefined;
}

/** How much of the parser's expected-token dump a reader is served by. */
const MAX_PARSER_DETAIL = 140;

/** `error at <line>:<column>: <what the parser expected>`. */
const PARSER_POSITION = /^error at (\d+):(\d+):\s*([\s\S]*)$/;

/**
 * Restate a parser failure in terms of the text the CALLER wrote.
 *
 * Two edits, both about the same lie: the position is the parser's, and the
 * parser read a query with N prepended `PREFIX` lines the caller never saw
 * ("16:41" for an error on line 1). And the expectation is a full dump of every
 * admissible Unicode range — five lines of `'\\u{00C0}'..='\\u{00D6}'` that tell
 * a reader nothing they can act on. The line number is corrected, the dump is
 * collapsed to one line and cut.
 *
 * The COLUMN is dropped when names were expanded: an expansion lengthens the
 * line it sits on, so the parser's column is a position in text the caller
 * never wrote. The line is safe either way — an expansion never adds a newline.
 *
 * @param detail - The parser's own message.
 * @param prependedLines - How many `PREFIX` lines were added above the query.
 * @param rewritten - Whether names were expanded (columns therefore moved).
 * @returns A one-line message positioned in the caller's own text.
 */
export function trimQueryError(
  detail: string,
  prependedLines: number,
  rewritten: boolean,
): string {
  const collapsed = detail.replace(/\s+/g, " ").trim();
  const match = PARSER_POSITION.exec(collapsed);
  if (!match) return cut(collapsed);
  const line = Number(match[1]) - prependedLines;
  const expected = cut(match[3] ?? "");
  if (line < 1)
    return `error at line ${match[1]}, column ${match[2]}: ${expected}`;
  const at = rewritten
    ? `error at line ${line}`
    : `error at line ${line}, column ${match[2]}`;
  return `${at}: ${expected}`;
}

/** One line, at most {@link MAX_PARSER_DETAIL} characters of it. */
function cut(text: string): string {
  return text.length <= MAX_PARSER_DETAIL
    ? text
    : `${text.slice(0, MAX_PARSER_DETAIL - 1).trimEnd()}…`;
}
