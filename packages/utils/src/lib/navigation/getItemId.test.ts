import type { Item } from "@canonical/ds-types";
import { describe, expect, it } from "vitest";
import { getItemId } from "./getItemId.js";

describe("getItemId", () => {
  it("returns url when present", () => {
    expect(getItemId({ url: "/about" })).toBe("/about");
  });

  it("returns key when url is absent", () => {
    expect(getItemId({ key: "section" })).toBe("section");
  });

  it("prefers url over key", () => {
    expect(getItemId({ url: "/about", key: "section" })).toBe("/about");
  });

  it("rejects an item with neither url nor key at the type level", () => {
    // The identity is a requirement of `Item`, which is what makes getItemId
    // total. Type-checking is the assertion here; the runtime expectation
    // below only keeps the binding used.
    // @ts-expect-error - an item with neither url nor key is not an Item
    const withoutIdentity: Item = { label: "no identity" };

    expect(withoutIdentity).toBeDefined();
  });
});
