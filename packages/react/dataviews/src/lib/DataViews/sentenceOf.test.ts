import { describe, expect, it } from "vitest";
import sentenceOf from "./sentenceOf.js";

describe("sentenceOf", () => {
  it("starts a lowercase reason with a capital and ends it with a stop", () => {
    expect(sentenceOf("a view needs a name")).toBe("A view needs a name.");
  });
});
