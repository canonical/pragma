/** The characters a `LIKE` pattern must escape to match them literally. */
const LIKE_SPECIAL = /[\\%_]/g;

/**
 * Spell the `LIKE` pattern a backend is sent for text a value contains:
 * `\`, `%` and `_` escaped with `\`, and the text wrapped in `%`, so the
 * operand is looked for literally anywhere in the value.
 */
export default function spellContainsPattern(operand: string): string {
  return `%${operand.replace(LIKE_SPECIAL, (special) => `\\${special}`)}%`;
}
