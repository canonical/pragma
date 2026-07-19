import { describe, expect, it } from "vitest";
import { SHELL_STRIP_META_KEY } from "./constants.js";
import { readStripSlots } from "./readStripSlots.js";

describe("readStripSlots", () => {
  it("returns undefined for absent meta or an absent entry", () => {
    expect(readStripSlots(undefined)).toBeUndefined();
    expect(readStripSlots({})).toBeUndefined();
    expect(readStripSlots({ otherKey: 1 })).toBeUndefined();
  });

  it("returns a well-formed entry as-is", () => {
    const Controls = () => null;
    const entry = { context: "Components", Controls };
    expect(readStripSlots({ [SHELL_STRIP_META_KEY]: entry })).toBe(entry);
  });

  it("accepts an empty claim (all sockets optional)", () => {
    expect(readStripSlots({ [SHELL_STRIP_META_KEY]: {} })).toEqual({});
  });

  it("throws on a malformed entry — a half-declared strip is a bug", () => {
    expect(() =>
      readStripSlots({ [SHELL_STRIP_META_KEY]: "Components" }),
    ).toThrow(/not an object/);
    expect(() =>
      readStripSlots({ [SHELL_STRIP_META_KEY]: { context: 42 } }),
    ).toThrow(/context is not a string/);
    expect(() =>
      readStripSlots({ [SHELL_STRIP_META_KEY]: { Controls: "<Filters/>" } }),
    ).toThrow(/Controls is not a component/);
    expect(() =>
      readStripSlots({ [SHELL_STRIP_META_KEY]: { Status: {} } }),
    ).toThrow(/Status is not a component/);
  });
});
