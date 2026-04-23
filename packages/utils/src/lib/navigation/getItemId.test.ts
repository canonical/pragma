import type { Item } from "@canonical/ds-types";
import { describe, expect, it } from "vitest";
import { getItemId } from "./getItemId.js";

describe("getItemId", () => {
  it("returns url when present", () => {
    expect(getItemId({ url: "/about" } as Item)).toBe("/about");
  });

  it("returns key when url is absent", () => {
    expect(getItemId({ key: "section" } as Item)).toBe("section");
  });

  it("prefers url over key", () => {
    expect(getItemId({ url: "/about", key: "section" } as Item)).toBe("/about");
  });

  it("throws when neither url nor key is present", () => {
    expect(() => getItemId({} as Item)).toThrow(
      "Item must have either url or key",
    );
  });
});
