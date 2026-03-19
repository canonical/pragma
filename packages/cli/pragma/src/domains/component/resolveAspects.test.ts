import { describe, expect, it } from "vitest";
import resolveAspects from "./resolveAspects.js";

describe("resolveAspects", () => {
  it("returns all aspects when none are set", () => {
    const result = resolveAspects({});
    expect(result).toEqual({
      anatomy: true,
      modifiers: true,
      tokens: true,
      implementations: true,
    });
  });

  it("returns all aspects when all are explicitly false", () => {
    const result = resolveAspects({
      anatomy: false,
      modifiers: false,
      tokens: false,
      implementations: false,
    });
    expect(result).toEqual({
      anatomy: true,
      modifiers: true,
      tokens: true,
      implementations: true,
    });
  });

  it("returns only selected aspects when one is set", () => {
    const result = resolveAspects({ modifiers: true });
    expect(result).toEqual({
      anatomy: false,
      modifiers: true,
      tokens: false,
      implementations: false,
    });
  });

  it("returns multiple selected aspects", () => {
    const result = resolveAspects({ modifiers: true, tokens: true });
    expect(result).toEqual({
      anatomy: false,
      modifiers: true,
      tokens: true,
      implementations: false,
    });
  });

  it("returns all selected when all are true", () => {
    const result = resolveAspects({
      anatomy: true,
      modifiers: true,
      tokens: true,
      implementations: true,
    });
    expect(result).toEqual({
      anatomy: true,
      modifiers: true,
      tokens: true,
      implementations: true,
    });
  });
});
