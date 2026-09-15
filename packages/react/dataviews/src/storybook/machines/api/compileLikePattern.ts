/**
 * A character a regular expression must escape to match it literally
 * outside a class: exactly its syntax characters, since a Unicode-aware
 * expression rejects an escape of any other.
 */
const REGEX_SPECIAL = /[\\^$.*+?()[\]{}|]/;

/** One pattern character as the regular expression source matching it literally. */
const spellLiteral = (character: string): string =>
  REGEX_SPECIAL.test(character) ? `\\${character}` : character;

/**
 * Compile a `LIKE` pattern escaped with `\`, as SQL reads one, into a test
 * of a whole value: `%` is any run of characters, `_` is one character, and
 * `\` makes the next character literal. Compiled once, so a query tests
 * every record against one expression. Case is not folded here; a backend
 * folds both sides first, as `lower(value) LIKE lower(pattern) ESCAPE '\'`
 * does.
 */
export default function compileLikePattern(
  pattern: string,
): (value: string) => boolean {
  let source = "";
  let escaped = false;
  for (const character of pattern) {
    if (escaped) {
      source += spellLiteral(character);
      escaped = false;
    } else if (character === "\\") {
      escaped = true;
    } else if (character === "%") {
      source += "[\\s\\S]*";
    } else if (character === "_") {
      source += "[\\s\\S]";
    } else {
      source += spellLiteral(character);
    }
  }
  const expression = new RegExp(`^${source}$`, "u");
  return (value) => expression.test(value);
}
