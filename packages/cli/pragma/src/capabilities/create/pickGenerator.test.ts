/**
 * `pragma create component` mirrors `summon component`: the framework is a
 * REQUIRED selector (summon's generator keys are `component/<framework>`),
 * not a defaulted one. These pins lock that contract so the old silent
 * `?? "react"` default cannot creep back — omitting the framework must error
 * naming the choices, never scaffold React by assumption.
 */

import { describe, expect, it } from "vitest";
import { pickGenerator } from "./pickGenerator.js";

describe("pickGenerator — component framework is required (summon parity)", () => {
  it("throws INVALID_INPUT when the framework is omitted (no silent React default)", () => {
    expect(() => pickGenerator("component", {})).toThrowError(/framework/i);
    // And it is NOT the React generator being returned — the throw is the
    // whole point (the bug was `?? "react"` quietly picking React). The error
    // carries the valid frameworks as options (surfaced to the user by the
    // renderer), the way summon would name the choices.
    let threw = false;
    try {
      pickGenerator("component", {});
    } catch (error) {
      threw = true;
      const options = (error as { validOptions?: readonly string[] })
        .validOptions;
      expect(options).toEqual(["react", "svelte", "lit"]);
    }
    expect(threw).toBe(true);
  });

  it("throws INVALID_INPUT for an empty-string framework", () => {
    expect(() => pickGenerator("component", { framework: "" })).toThrowError(
      /framework/i,
    );
  });

  it("throws INVALID_INPUT for an unknown framework", () => {
    expect(() =>
      pickGenerator("component", { framework: "angular" }),
    ).toThrowError(/framework/i);
  });

  it("returns the matching generator for each supported framework", () => {
    for (const framework of ["react", "svelte", "lit"] as const) {
      expect(pickGenerator("component", { framework })).toBeDefined();
    }
  });
});
