import { describe, expect, it } from "vitest";
import composeSentence from "./composeSentence.js";

describe("composeSentence", () => {
  it("capitalises a lowercase fragment and ends it with a full stop", () => {
    expect(composeSentence("not a number")).toBe("Not a number.");
  });

  it("keeps one full stop where the reason already ends in one", () => {
    expect(composeSentence("not a number.")).toBe("Not a number.");
  });

  it("capitalises a first character outside the basic plane whole", () => {
    expect(composeSentence("\u{10428} is not a number")).toBe(
      "\u{10400} is not a number.",
    );
  });

  it("leaves an empty reason as a bare full stop", () => {
    expect(composeSentence("")).toBe(".");
  });
});
