import type { ApiTextMatch } from "./types.js";

/** The characters a `LIKE` pattern must escape to match them literally. */
const LIKE_SPECIAL = /[\\%_]/g;

/**
 * Spell the `LIKE` pattern a backend is sent for text a value contains or
 * starts with: `\`, `%` and `_` escaped with `\`, then the text followed by
 * `%`, and for `contains` preceded by one too, so the operand is looked for
 * literally anywhere in the value, or at its start.
 */
export default function spellLikePattern(
  operator: ApiTextMatch["operator"],
  operand: string,
): string {
  const literal = operand.replace(LIKE_SPECIAL, (special) => `\\${special}`);
  return operator === "contains" ? `%${literal}%` : `${literal}%`;
}
