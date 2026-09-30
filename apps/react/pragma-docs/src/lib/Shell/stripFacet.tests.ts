import { describe, expect, it } from "vitest";
import { SHELL_STRIP_META_KEY } from "./constants.js";
import { shellStripFacet } from "./stripFacet.js";

// Retargeted from `readStripSlots.tests.ts` at the facet migration: the
// SUBJECT changed, the assertions did not. That is the point — these four
// message assertions plus the identity check are the conformance harness the
// helper had to carry through unchanged.
describe("shellStripFacet.read", () => {
  it("returns undefined for absent meta or an absent entry", () => {
    expect(shellStripFacet.read(undefined)).toBeUndefined();
    expect(shellStripFacet.read({})).toBeUndefined();
    expect(shellStripFacet.read({ otherKey: 1 })).toBeUndefined();
  });

  it("returns a well-formed entry as-is", () => {
    const Context = () => null;
    const Controls = () => null;
    const entry = { Context, Controls };
    expect(shellStripFacet.read({ [SHELL_STRIP_META_KEY]: entry })).toBe(entry);
  });

  it("accepts an empty claim (all sockets optional)", () => {
    expect(shellStripFacet.read({ [SHELL_STRIP_META_KEY]: {} })).toEqual({});
  });

  it("throws on a malformed entry — a half-declared strip is a bug", () => {
    expect(() =>
      shellStripFacet.read({ [SHELL_STRIP_META_KEY]: "Components" }),
    ).toThrow(/not an object/);
    expect(() =>
      shellStripFacet.read({
        [SHELL_STRIP_META_KEY]: { Context: "Components" },
      }),
    ).toThrow(/Context is not a component/);
    expect(() =>
      shellStripFacet.read({
        [SHELL_STRIP_META_KEY]: { Controls: "<Filters/>" },
      }),
    ).toThrow(/Controls is not a component/);
    expect(() =>
      shellStripFacet.read({ [SHELL_STRIP_META_KEY]: { Status: {} } }),
    ).toThrow(/Status is not a component/);
  });

  it("authors a claim under the same key it reads", () => {
    // `of()` is the authoring half the old reader had no counterpart for —
    // the half that makes the claim sites' `satisfies` redundant.
    const Context = () => null;
    expect(shellStripFacet.of({ Context })).toEqual({
      [SHELL_STRIP_META_KEY]: { Context },
    });
  });
});
