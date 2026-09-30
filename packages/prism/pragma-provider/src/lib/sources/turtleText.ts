/**
 * Applying a text transform to the SYNTAX of a Turtle document only.
 *
 * Two things this package does to a source before the parser sees it are
 * spelled as regular expressions over the whole file: harvesting the prefix
 * prologue (`harvestPrefixes`) and escaping channel-dotted local names
 * (`escapeChannelDottedRefs`). A regular expression cannot tell a prefixed
 * name from the same characters sitting inside an `rdfs:comment`, and the
 * corpus is full of prose annotations, so both were reading — and one was
 * REWRITING — text that Turtle treats as opaque data. Two ways that bites:
 *
 *   - a commented-out or quoted declaration (`# was @prefix ds: <old>`) is
 *     harvested, and under last-wins it can displace the real namespace, so
 *     the compiler shortens IRIs with a mapping the parser never applied;
 *   - a literal that merely mentions the spelling (`"see ds:.foo"`) gets a
 *     backslash inserted into it. `\.` is not a valid Turtle string escape
 *     and a backslash is not valid inside an `<IRIREF>` at all, so a source
 *     that parsed before the rewrite fails to parse after it.
 *
 * Neither is hypothetical for a corpus whose whole purpose is documentation
 * prose about a graph, which is why this is a scanner rather than a warning
 * in a comment.
 */

/**
 * The spans of a Turtle document that are NOT ordinary syntax: comments,
 * string literals in all four quoting forms, and `<IRIREF>`s.
 *
 * The alternatives are ordered and the scan is left to right, so whichever
 * span opens first swallows the rest: a `#` inside `<http://ex.org#term>`
 * cannot start a comment, and a quote inside a comment cannot open a string.
 * That ordering is the whole correctness argument — there is no state to keep
 * beyond it.
 *
 * `<IRIREF>` uses Turtle's own exclusion set (no `<`, `>`, `"`, `{`, `}`,
 * `|`, `^`, backtick, backslash or newline), so a bare `<` that is not an IRI
 * simply fails the alternative and is left alone.
 */
const OPAQUE_SPAN =
  /#[^\n]*|"""[\s\S]*?"""|'''[\s\S]*?'''|"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|<[^<>"{}|^`\\\n]*>/g;

/**
 * Rewrite only the syntax of a Turtle document, leaving comments, string
 * literals and IRI references byte-identical.
 *
 * `transform` is handed each run of syntax between opaque spans and returns
 * its replacement. It sees the text in pieces, so it must not depend on
 * matching across a span boundary — neither caller does: a prefix directive
 * ends before the `<`, and a channel-dotted reference is a single token.
 *
 * @param content - The Turtle source.
 * @param transform - Applied to each syntax run.
 * @returns The document with `transform` applied to its syntax alone.
 */
export const mapTurtleSyntax = (
  content: string,
  transform: (syntax: string) => string,
): string => {
  let out = "";
  let cursor = 0;
  for (const match of content.matchAll(OPAQUE_SPAN)) {
    out += transform(content.slice(cursor, match.index)) + match[0];
    cursor = match.index + match[0].length;
  }
  return out + transform(content.slice(cursor));
};

/**
 * The same document with every opaque span blanked to spaces (newlines kept,
 * so offsets and line numbers still line up).
 *
 * For the reader that has to MATCH across an IRI reference rather than rewrite
 * text — a prefix directive is `@prefix ds: <…>`, whose second half is an
 * IRIREF — masking is the wrong tool, so this deliberately keeps IRI
 * references intact and blanks only comments and string literals.
 *
 * @param content - The Turtle source.
 * @returns The document with comments and string literals blanked.
 */
export const blankTurtleProse = (content: string): string =>
  content.replace(OPAQUE_SPAN, (span) =>
    span.startsWith("<") ? span : span.replace(/[^\n]/g, " "),
  );
