/**
 * The cursor a caller spends to ask for the page after this one.
 *
 * WHY AN OFFSET. The candidate alternative is a keyset cursor encoding the last
 * row's ordering key, which does not drift when the store changes underneath a
 * caller. It cannot be general, and `block list` is the counterexample: it
 * orders by `?tierRank`, a variable its SELECT does not project, so the
 * ordering key is not in the rows at all — and a pagination mechanism that
 * works only for stories whose ordering keys happen to be columns is not a
 * pagination mechanism. An offset needs nothing from the rows.
 *
 * The drift an offset admits is bounded by what the store is: a read-only,
 * content-addressed pack that changes only when `sources update` rebuilds it.
 * Between two pages of one browse there is no writer.
 *
 * What an offset cannot survive is the caller changing the QUESTION between
 * pages — different filters, a different search term, another story — which is
 * why the cursor carries a fingerprint of the read it was issued for and
 * refuses to be spent on another. That is the failure worth catching, and the
 * one a bare integer would have answered wrongly and in silence.
 *
 * The encoding is opaque on purpose: a caller who cannot read it cannot come to
 * depend on it, so the day a story needs a keyset cursor the cursor's contents
 * change and its contract does not.
 *
 * The fingerprint does not cover the OFFSET, and cannot: a cursor is a token
 * this build issued, not a signed one, so its `o` is editable by anyone who
 * base64-decodes it. That is why the offset is BOUNDED here as well as parsed
 * here — an `o` of 2^53 is a legal JSON integer that the store answers with a
 * raw parse error, so {@link ./paging.MAX_LIST_WINDOW} is checked before the
 * number can reach a query.
 */

import { createHash } from "node:crypto";
import { PragmaError } from "../error/index.js";
import { MAX_LIST_WINDOW } from "./paging.js";

/** The cursor encoding's own version, so a future keyset form is tellable apart. */
const CURSOR_VERSION = 1;

/**
 * The identity of the read a cursor belongs to — the author query and the
 * arguments that narrow it, hashed short.
 *
 * Each part is LENGTH-PREFIXED rather than merely joined. A separator is only
 * unambiguous if it cannot occur inside a part, and these parts are SPARQL
 * text and JSON — there is no such character. Two different argument lists
 * hashing the same would let a cursor be spent on a read it was not issued
 * for, which is the single thing this function exists to prevent.
 *
 * @param parts - Everything that decides which rows the read returns.
 * @returns A short, stable fingerprint.
 */
export function pageFingerprint(parts: readonly string[]): string {
  const hash = createHash("sha256");
  for (const part of parts) hash.update(`${part.length}:${part}`);
  return hash.digest("base64url").slice(0, 12);
}

/**
 * Encode the cursor that asks for the rows after this page.
 *
 * @param offset - The row index the next page starts at.
 * @param fingerprint - The read this cursor may be spent on.
 * @returns An opaque, URL-safe token.
 */
export function encodeCursor(offset: number, fingerprint: string): string {
  const payload = JSON.stringify({
    v: CURSOR_VERSION,
    o: offset,
    q: fingerprint,
  });
  return Buffer.from(payload, "utf8").toString("base64url");
}

/**
 * Read an `--after`/`after` cursor back into an offset.
 *
 * @param provided - The raw argument, if any.
 * @param fingerprint - The read the cursor must have been issued for.
 * @returns The row index to start at (0 when no cursor was given).
 * @throws PragmaError INVALID_INPUT when the token is not a cursor this build
 *   issued, or was issued for a different read — a mismatch answered with rows
 *   would be a page of the wrong question, with nothing to show it.
 */
export function readCursor(provided: unknown, fingerprint: string): number {
  if (provided === undefined) return 0;
  const decoded = decodeCursor(provided);
  if (!decoded) {
    throw PragmaError.invalidInput("after", String(provided), {
      recovery: {
        message:
          "--after takes the cursor from a previous page of this same read; run the read without it to start from the first page.",
      },
    });
  }
  if (decoded.q !== fingerprint) {
    throw PragmaError.invalidInput("after", String(provided), {
      recovery: {
        message:
          "This cursor was issued for a different read — the filters or the search term changed. Run the new read without --after to start from its first page.",
      },
    });
  }
  return decoded.o;
}

/**
 * The cursor payload, or `undefined` for anything that is not one.
 *
 * The offset is checked against {@link MAX_LIST_WINDOW} here rather than at the
 * store: an unbounded `o` is emitted straight into the generated query's
 * `OFFSET`, where a number the engine cannot express comes back as a parse
 * error dressed as an internal one. Refused here, a hand-edited offset is the
 * same calm INVALID_INPUT as every other malformed cursor.
 */
function decodeCursor(
  provided: unknown,
): { readonly o: number; readonly q: string } | undefined {
  if (typeof provided !== "string" || provided === "") return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(provided, "base64url").toString("utf8"));
  } catch {
    return undefined;
  }
  if (typeof parsed !== "object" || parsed === null) return undefined;
  const payload = parsed as Record<string, unknown>;
  if (payload.v !== CURSOR_VERSION) return undefined;
  if (!Number.isInteger(payload.o)) return undefined;
  const offset = payload.o as number;
  if (offset < 0 || offset > MAX_LIST_WINDOW) return undefined;
  if (typeof payload.q !== "string") return undefined;
  return { o: offset, q: payload.q };
}
