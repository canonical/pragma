import { describe, expect, it } from "vitest";
import { ERROR_CODES } from "../error/index.js";
import { EXIT_CODES } from "./constants.js";
import mapExitCode from "./mapExitCode.js";

describe("mapExitCode", () => {
  it("maps ENTITY_NOT_FOUND to 1", () => {
    expect(mapExitCode("ENTITY_NOT_FOUND")).toBe(1);
  });

  it("maps EMPTY_RESULTS to 2", () => {
    expect(mapExitCode("EMPTY_RESULTS")).toBe(2);
  });

  it("maps INVALID_INPUT to 3", () => {
    expect(mapExitCode("INVALID_INPUT")).toBe(3);
  });

  it("maps AMBIGUOUS_INPUT to 3", () => {
    expect(mapExitCode("AMBIGUOUS_INPUT")).toBe(3);
  });

  it("maps CONFIG_ERROR to 4", () => {
    expect(mapExitCode("CONFIG_ERROR")).toBe(4);
  });

  it("maps STORE_ERROR to 5", () => {
    expect(mapExitCode("STORE_ERROR")).toBe(5);
  });

  it("maps INTERNAL_ERROR to 127", () => {
    expect(mapExitCode("INTERNAL_ERROR")).toBe(127);
  });

  it("covers every ErrorCode", () => {
    for (const code of ERROR_CODES) {
      expect(typeof mapExitCode(code)).toBe("number");
    }
    expect(Object.keys(EXIT_CODES)).toHaveLength(ERROR_CODES.length);
  });
});
