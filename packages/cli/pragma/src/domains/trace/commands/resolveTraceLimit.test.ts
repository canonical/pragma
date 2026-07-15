import { describe, expect, it } from "vitest";
import { PragmaError } from "#error";
import { resolveTraceLimit } from "./show.js";

describe("resolveTraceLimit", () => {
  it("defaults to 50 when absent", () => {
    expect(resolveTraceLimit(undefined)).toBe(50);
    expect(resolveTraceLimit("")).toBe(50);
  });

  it("accepts a positive integer", () => {
    expect(resolveTraceLimit("20")).toBe(20);
    expect(resolveTraceLimit(" 5 ")).toBe(5);
  });

  it.each([
    "notanumber",
    "-5",
    "0",
    "3.5",
    "1e1",
    "0x5",
  ])("rejects the non-positive-integer value %j", (value) => {
    expect(() => resolveTraceLimit(value)).toThrowError(PragmaError);
    try {
      resolveTraceLimit(value);
    } catch (error) {
      expect((error as PragmaError).code).toBe("INVALID_INPUT");
    }
  });
});
