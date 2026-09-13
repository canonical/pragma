import { describe, expect, it } from "vitest";
import composeSentence from "./composeSentence.js";

describe("composeSentence", () => {
  it("starts a lowercase reason with a capital and ends it with a stop", () => {
    expect(composeSentence("a view needs a name")).toBe("A view needs a name.");
  });
});
