import { describe, expect, it } from "vitest";
import type { LookupResult } from "./contracts.js";
import resolveLookupExitCode from "./resolveLookupExitCode.js";

function makeResult<T>(
  results: T[],
  errors: LookupResult<T>["errors"],
): LookupResult<T> {
  return { results, errors };
}

describe("resolveLookupExitCode", () => {
  it("returns 0 when at least one result was found", () => {
    const result = makeResult(
      [{ name: "ok" }],
      [{ query: "miss", code: "ENTITY_NOT_FOUND", message: "not found" }],
    );
    expect(resolveLookupExitCode(result)).toBe(0);
  });

  it("returns 0 when there are no errors", () => {
    expect(resolveLookupExitCode(makeResult([{ name: "ok" }], []))).toBe(0);
  });

  it("maps an all-not-found lookup to exit 1", () => {
    const result = makeResult(
      [],
      [{ query: "x", code: "ENTITY_NOT_FOUND", message: "not found" }],
    );
    expect(resolveLookupExitCode(result)).toBe(1);
  });

  it("maps an all-invalid-input lookup to exit 3", () => {
    const result = makeResult(
      [],
      [{ query: "x", code: "INVALID_INPUT", message: "bad" }],
    );
    expect(resolveLookupExitCode(result)).toBe(3);
  });

  it("falls back to exit 1 for an unrecognised error code", () => {
    const result = makeResult(
      [],
      [{ query: "x", code: "NOT_A_REAL_CODE", message: "?" }],
    );
    expect(resolveLookupExitCode(result)).toBe(1);
  });
});
