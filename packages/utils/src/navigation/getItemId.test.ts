import { describe, expect, it } from "vitest";
import { getItemId } from "./getItemId.js";

describe("getItemId", () => {
  it("returns url when present", () => {
    expect(getItemId({ url: "/home" })).toBe("/home");
  });

  it("returns key when url is absent", () => {
    expect(getItemId({ key: "section-header" })).toBe("section-header");
  });

  it("prefers url over key when both are present", () => {
    expect(getItemId({ url: "/home", key: "home-key" })).toBe("/home");
  });

  it("throws when neither url nor key is provided", () => {
    expect(() => getItemId({})).toThrow("Item must have either url or key");
  });
});
