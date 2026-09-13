import { describe, expect, it } from "vitest";
import { filterStatusBy } from "../../../testing/fixtures.js";
import { EMPTY_SLICE } from "./constants.js";
import spellSliceKey from "./spellSliceKey.js";

describe("spellSliceKey", () => {
  it("spells one key for two spellings of the same query", () => {
    expect(spellSliceKey(filterStatusBy(["ready", "failed"]))).toBe(
      spellSliceKey(filterStatusBy(["failed", "ready", "ready"])),
    );
    expect(spellSliceKey({ ...EMPTY_SLICE, search: "" })).toBe(
      spellSliceKey(EMPTY_SLICE),
    );
  });

  it("tells apart queries that differ in what they ask for", () => {
    expect(spellSliceKey(filterStatusBy(["ready"]))).not.toBe(
      spellSliceKey(filterStatusBy(["failed"])),
    );
    // The string "0" never equals the number 0; NaN equals itself.
    expect(spellSliceKey(filterStatusBy([0]))).not.toBe(
      spellSliceKey(filterStatusBy(["0"])),
    );
    expect(spellSliceKey(filterStatusBy([Number.NaN]))).toBe(
      spellSliceKey(filterStatusBy([Number.NaN])),
    );
  });
});
