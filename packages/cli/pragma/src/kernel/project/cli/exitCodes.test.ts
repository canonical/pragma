import { describe, expect, it } from "vitest";
import { ERROR_CODES } from "../../error/constants.js";
import type { ErrorCode } from "../../error/types.js";
import { EXIT, mapExitCode } from "./exitCodes.js";

/**
 * Protected: the exit-code table is a frozen covenant (D2). Every error code
 * maps (via {@link mapExitCode}) to exactly one of the four blessed
 * ERROR-CLASSIFICATION codes, and the table below is the enumerated contract —
 * changing a mapping must change this test.
 *
 * `INTERRUPTED` (130, UNIX 128+SIGINT) is an INTENTIONAL out-of-band addition:
 * it is set DIRECTLY at the dispatch catch (like the existing exit-0 cancel),
 * NEVER produced by `mapExitCode`, so the frozen four-code classification range
 * is untouched. The tests below assert exactly that split.
 */
describe("exit codes (PROTECTED)", () => {
  it("blesses exactly four error-classification codes (mapExitCode's frozen range)", () => {
    // The four codes mapExitCode is allowed to produce. 130 is deliberately NOT
    // among them — it bypasses the map (asserted by the exhaustive table below).
    expect({
      OK: EXIT.OK,
      RUNTIME: EXIT.RUNTIME,
      USAGE: EXIT.USAGE,
      STORE_UNAVAILABLE: EXIT.STORE_UNAVAILABLE,
    }).toEqual({ OK: 0, RUNTIME: 1, USAGE: 2, STORE_UNAVAILABLE: 3 });
  });

  it("adds INTERRUPTED=130 as an out-of-band code never produced by mapExitCode", () => {
    // A deliberate SIGINT/interrupt exit (UNIX 128+SIGINT), set directly at the
    // dispatch catch. It must never leak into mapExitCode's classification range.
    expect(EXIT.INTERRUPTED).toBe(130);
    const produced = new Set(ERROR_CODES.map(mapExitCode));
    expect(produced.has(130)).toBe(false);
    expect([...produced].every((c) => c === 1 || c === 2 || c === 3)).toBe(
      true,
    );
  });

  const table: Record<ErrorCode, number> = {
    ENTITY_NOT_FOUND: 1,
    EMPTY_RESULTS: 1,
    CONFIG_ERROR: 1,
    INTERNAL_ERROR: 1,
    UNSUPPORTED: 1,
    INVALID_INPUT: 2,
    AMBIGUOUS_INPUT: 2,
    UNKNOWN_VERB: 2,
    STORE_UNAVAILABLE: 3,
  };

  it.each(ERROR_CODES)("maps %s to its exit code", (code) => {
    expect(mapExitCode(code)).toBe(table[code]);
  });

  it("covers every error code in the table", () => {
    expect(Object.keys(table).sort()).toEqual([...ERROR_CODES].sort());
  });
});
