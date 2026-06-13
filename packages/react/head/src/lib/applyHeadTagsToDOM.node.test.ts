// @vitest-environment node
import { describe, expect, it } from "vitest";
import applyHeadTagsToDOM from "./applyHeadTagsToDOM.js";

describe("applyHeadTagsToDOM in non-DOM environments", () => {
  it("is a no-op without a document", () => {
    expect(typeof document).toBe("undefined");
    expect(
      applyHeadTagsToDOM({
        title: "Title",
        meta: [{ name: "description", content: "Desc" }],
        link: [{ rel: "canonical", href: "https://example.com" }],
      }),
    ).toEqual([]);
  });
});
