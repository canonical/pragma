import { describe, expect, it } from "vitest";
import { ERROR_CODES } from "../../error/constants.js";
import type { ErrorCode } from "../../error/types.js";
import { EXIT, mapExitCode } from "./exitCodes.js";

/**
 * Protected: the exit-code table is a frozen covenant (D2). Every error code
 * maps to exactly one of the four blessed codes, and the table below is the
 * enumerated contract — changing a mapping must change this test.
 */
describe("exit codes (PROTECTED)", () => {
  it("blesses exactly four codes", () => {
    expect(EXIT).toEqual({
      OK: 0,
      RUNTIME: 1,
      USAGE: 2,
      STORE_UNAVAILABLE: 3,
    });
  });

  const table: Record<ErrorCode, number> = {
    ENTITY_NOT_FOUND: 1,
    EMPTY_RESULTS: 1,
    STORE_ERROR: 1,
    CONFIG_ERROR: 1,
    INTERNAL_ERROR: 1,
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
