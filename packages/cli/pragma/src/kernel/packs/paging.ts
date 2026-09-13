/**
 * The page a list-shaped verb answers with: how many rows, and where from.
 *
 * WHY A DEFAULT AT ALL. Before this, no list carried a cap: every declared
 * story returned its whole population on every call, and an agent calling one
 * speculatively paid for all of it. A default is what makes the cap real — a
 * `--limit` nobody passes bounds nothing.
 *
 * WHY THIS DEFAULT. It answers to TWO constraints, and it is the largest number
 * that satisfies both.
 *
 * From below: it stays above the row count of every story that already existed
 * when the page arrived (the largest, `block list`, is 252), so no answer that
 * was whole before the pair is truncated by it now.
 *
 * From above: the payload budget bounds ONE answer, and the suite that enforces
 * it requires the largest default answer to sit under 0.8 of the ceiling —
 * 100,000 bytes — so a ceiling nothing approaches keeps catching things and one
 * sitting on the measurement does not flake. The fattest row any declared story
 * serialises is `token values` at 244 bytes, so 300 rows of it is about 73 KB
 * and the gate holds with room to spare.
 *
 * The first constraint alone gave 500, which is what this was, and the second
 * retired it: the token-graph stories brought populations of 745, 1,156, 1,237
 * and 1,746 rows, and at 500 rows `token values` measured 121,776 bytes —
 * inside the ceiling and past the gate, with no headroom left. So the number is
 * now derived from the budget rather than from a population that no longer
 * bounds anything.
 *
 * It is still a KERNEL default and not a per-story one — a story has no
 * page-size knob, so there is exactly one number to know, and it is written
 * here, in the help text of every list verb, and in `BUDGETS.md` beside the
 * payload it bounds. A per-story knob is what to reach for when one story's
 * rows are so much fatter than the rest that one number cannot serve both;
 * that is not true of any story today.
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
 * Derived from the payload budget and from the populations that predate the
 * page — see the module note for both halves of the arithmetic.
 */
export const DEFAULT_LIST_LIMIT = 300;

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
 * rounded down to a number a message can carry, that is 40,000. It stays 22×
 * the largest population the distribution ships (1,746) and 133× the default
 * page, so it refuses nothing a caller could want today.
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
