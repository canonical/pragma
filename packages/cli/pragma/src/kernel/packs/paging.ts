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
 * WHY A CEILING AS WELL. The page's two integers are emitted into the query
 * ({@link ./sparql/buildListQuery}), and the store's own `LIMIT`/`OFFSET` must
 * fit a 32-bit integer while `Number.isInteger` admits anything up to 2^53. So
 * `--limit 9007199254740991` — the natural "give me everything" an agent
 * writes — used to reach the engine and come back as a raw parse error wrapped
 * in INTERNAL_ERROR and "report this issue", from a flag whose own help invited
 * a larger number. {@link MAX_LIST_WINDOW} is where both halves of the window
 * are refused instead, with the typed INVALID_INPUT the rest of the pair uses
 * and the ceiling named in the message.
 *
 * The cursor that carries a caller from one page to the next is
 * {@link ./cursor}, kept apart because it hashes and this module is reached
 * from the compiler on the storeless `--help` path. It bounds its own offset by
 * the same ceiling, from here.
 */

import { PragmaError } from "../error/index.js";

/**
 * Rows a list-shaped verb returns when the caller names no `--limit`.
 *
 * Above every declared story's population, deliberately — see the module note.
 */
export const DEFAULT_LIST_LIMIT = 500;

/**
 * The largest `--limit`, and the largest cursor offset, the kernel admits.
 *
 * NOT the engine's limit, which is an implementation detail of the pinned store
 * and would make the refusal a fact about oxigraph. It comes from the payload
 * budget instead, which is a fact about the answer: `BUDGETS.md`'s
 * `LIST_PAYLOAD_BUDGET_BYTES` is 125,000, and the narrowest row a story can
 * possibly serialise is `{}` plus its separating comma — three bytes — so no
 * answer of more than 41,666 rows can be inside the budget whatever a story's
 * columns are. A limit that cannot produce a legal answer is not a legal limit;
 * rounded down to a number a message can carry, that is 40,000. It stays 158×
 * the largest population the distribution ships (252) and 80× the default page,
 * so it refuses nothing a caller could want today.
 *
 * The cursor's OFFSET takes the same ceiling, for a reason of its own: an offset
 * is a count of rows already answered, and a walk that has passed 40,000 of
 * them is walking a population more than two orders of magnitude larger than
 * any single legal answer — the point at which the cursor to spend is a keyset
 * cursor, which is what the encoding's `v` field exists to allow. Until such a
 * story exists, an offset that large is a hand-built or tampered token, and one
 * typed refusal is the honest answer to both.
 *
 * `listBudget.shipped.exec.test.ts` asserts the arithmetic tying this to the
 * budget, so the two cannot drift apart in silence.
 */
export const MAX_LIST_WINDOW = 40_000;

/**
 * Read the `--limit`/`limit` argument.
 *
 * @param provided - The raw argument, if any.
 * @returns The requested limit, or {@link DEFAULT_LIST_LIMIT}.
 * @throws PragmaError INVALID_INPUT for anything that is not a whole number
 *   between 1 and {@link MAX_LIST_WINDOW}. The ceiling is named in the message:
 *   a refusal that does not say what it would accept is a guessing game.
 */
export function readLimit(provided: unknown): number {
  if (provided === undefined) return DEFAULT_LIST_LIMIT;
  const value = typeof provided === "number" ? provided : Number(provided);
  if (!Number.isInteger(value) || value < 1 || value > MAX_LIST_WINDOW) {
    throw PragmaError.invalidInput("limit", String(provided), {
      recovery: {
        message: `--limit takes a whole number of rows, 1 to ${MAX_LIST_WINDOW} (default ${DEFAULT_LIST_LIMIT}).`,
      },
    });
  }
  return value;
}
