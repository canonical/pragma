import { describe, expect, it } from "vitest";
import createIdentity from "./createIdentity.js";
import isIdentity from "./isIdentity.js";

describe("isIdentity", () => {
  it("accepts identity tokens", () => {
    expect(isIdentity(createIdentity())).toBe(true);
  });

  it("rejects null and undefined", () => {
    expect(isIdentity(null)).toBe(false);
    expect(isIdentity(undefined)).toBe(false);
  });

  it("rejects primitives", () => {
    expect(isIdentity(42)).toBe(false);
    expect(isIdentity("DataViewsIdentity")).toBe(false);
  });

  it("rejects plain objects", () => {
    expect(isIdentity({})).toBe(false);
    expect(isIdentity({ key: "provider" })).toBe(false);
  });

  it("rejects forged symbol keys with the same description", () => {
    const forged = { [Symbol("DataViewsIdentity")]: true };
    expect(isIdentity(forged)).toBe(false);
  });

  it("rejects string-keyed look-alikes", () => {
    expect(isIdentity({ DataViewsIdentity: true })).toBe(false);
  });

  it("rejects structural copies of a real token", () => {
    const token = createIdentity();
    expect(isIdentity({ ...token })).toBe(false);
    expect(isIdentity(Object.assign({}, token))).toBe(false);
    expect(isIdentity(Object.create(token))).toBe(false);
  });
});
