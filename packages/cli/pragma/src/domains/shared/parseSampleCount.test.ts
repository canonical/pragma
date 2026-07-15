import { describe, expect, it } from "vitest";
import { PragmaError } from "../../error/index.js";
import parseSampleCount, {
  DEFAULT_SAMPLE_COUNT,
  MAX_SAMPLE_COUNT,
  MIN_SAMPLE_COUNT,
} from "./parseSampleCount.js";

describe("parseSampleCount", () => {
  it("returns the default for undefined/null/empty input", () => {
    expect(parseSampleCount(undefined)).toBe(DEFAULT_SAMPLE_COUNT);
    expect(parseSampleCount(null)).toBe(DEFAULT_SAMPLE_COUNT);
    expect(parseSampleCount("")).toBe(DEFAULT_SAMPLE_COUNT);
  });

  it("accepts an in-range integer verbatim", () => {
    expect(parseSampleCount("3")).toBe(3);
    expect(parseSampleCount(4)).toBe(4);
  });

  it("clamps below the minimum and above the maximum", () => {
    expect(parseSampleCount("0")).toBe(MIN_SAMPLE_COUNT);
    expect(parseSampleCount("-3")).toBe(MIN_SAMPLE_COUNT);
    expect(parseSampleCount("99")).toBe(MAX_SAMPLE_COUNT);
  });

  it("tolerates surrounding whitespace", () => {
    expect(parseSampleCount(" 3 ")).toBe(3);
  });

  it.each([
    "abc",
    "3.5",
    "0x5",
    "1e1",
    "3,4",
    "NaN",
    "Infinity",
  ])("throws INVALID_INPUT for the non-integer value %j", (value) => {
    expect(() => parseSampleCount(value)).toThrowError(PragmaError);
    try {
      parseSampleCount(value);
    } catch (error) {
      expect((error as PragmaError).code).toBe("INVALID_INPUT");
    }
  });
});
