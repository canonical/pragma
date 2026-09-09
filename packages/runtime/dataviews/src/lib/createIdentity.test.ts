import { describe, expect, it } from "vitest";
import createIdentity from "./createIdentity.js";

describe("createIdentity", () => {
  it("returns a fresh token per call", () => {
    expect(createIdentity()).not.toBe(createIdentity());
  });

  it("freezes the token against mutation", () => {
    expect(Object.isFrozen(createIdentity())).toBe(true);
  });

  it("keeps the brand out of structural copies", () => {
    const token = createIdentity() as object;
    expect({ ...token }).toEqual({});
  });
});
