/**
 * The page a list-shaped verb answers with: how many rows, and where from.
 *
 * WHY A DEFAULT AT ALL. Before this, no list carried a cap: every declared
 * story returned its whole population on every call, and an agent calling one
 * speculatively paid for all of it. A default is what makes the cap real — a
 * `--limit` nobody passes bounds nothing.
 *
 * WHY THIS DEFAULT. {@link DEFAULT_LIST_LIMIT} sits above the row count of
 * every story the distribution declares (the largest, `block list`, is 252), so
 * the pair arrives truncating nothing: today's answers are the answers, byte
 * for byte, and the mechanism is exercised first by the populations large
 * enough to need it. It is a KERNEL default and not a per-story one — a story
 * has no page-size knob, so there is exactly one number to know, and it is
 * written here, in the help text of every list verb, and in `BUDGETS.md`
 * beside the payload it bounds.
 *
 * The cursor that carries a caller from one page to the next is
 * {@link ./cursor}, kept apart because it hashes and this module is reached
 * from the compiler on the storeless `--help` path.
 */

import { PragmaError } from "../error/index.js";

/**
 * Rows a list-shaped verb returns when the caller names no `--limit`.
 *
 * Above every declared story's population, deliberately — see the module note.
 */
export const DEFAULT_LIST_LIMIT = 500;

/**
 * Read the `--limit`/`limit` argument.
 *
 * @param provided - The raw argument, if any.
 * @returns The requested limit, or {@link DEFAULT_LIST_LIMIT}.
 * @throws PragmaError INVALID_INPUT for anything that is not a positive integer.
 *   There is no upper bound: asking for the whole population is legitimate, and
 *   it is the way a caller who wants an unpaginated answer gets one.
 */
export function readLimit(provided: unknown): number {
  if (provided === undefined) return DEFAULT_LIST_LIMIT;
  const value = typeof provided === "number" ? provided : Number(provided);
  if (!Number.isInteger(value) || value < 1) {
    throw PragmaError.invalidInput("limit", String(provided), {
      recovery: {
        message: `--limit takes a whole number of rows, 1 or more (default ${DEFAULT_LIST_LIMIT}).`,
      },
    });
  }
  return value;
}
