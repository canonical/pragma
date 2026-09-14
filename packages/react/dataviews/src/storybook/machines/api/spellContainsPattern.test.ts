import { describe, expect, it } from "vitest";
import compileLikePattern from "./compileLikePattern.js";
import spellContainsPattern from "./spellContainsPattern.js";

describe("spellContainsPattern", () => {
  it("escapes what a pattern reads specially and wraps the text", () => {
    expect(spellContainsPattern("web")).toBe("%web%");
    expect(spellContainsPattern("50%_\\")).toBe("%50\\%\\_\\\\%");
  });

  it("spells a pattern that matches the operand and nothing broader", () => {
    const matches = compileLikePattern(spellContainsPattern("k_a"));
    expect(matches("disk_a")).toBe(true);
    expect(matches("diskXa")).toBe(false);
  });
});
