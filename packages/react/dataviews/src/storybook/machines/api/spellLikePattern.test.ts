import { describe, expect, it } from "vitest";
import compileLikePattern from "./compileLikePattern.js";
import spellLikePattern from "./spellLikePattern.js";

describe("spellLikePattern", () => {
  it("escapes what a pattern reads specially and wraps the text it contains", () => {
    expect(spellLikePattern("contains", "web")).toBe("%web%");
    expect(spellLikePattern("contains", "50%_\\")).toBe("%50\\%\\_\\\\%");
  });

  it("anchors the text a value starts with", () => {
    expect(spellLikePattern("startsWith", "web")).toBe("web%");
    expect(spellLikePattern("startsWith", "50%_\\")).toBe("50\\%\\_\\\\%");
  });

  it("spells a pattern that matches the operand and nothing broader", () => {
    const contains = compileLikePattern(spellLikePattern("contains", "k_a"));
    expect(contains("disk_a")).toBe(true);
    expect(contains("diskXa")).toBe(false);
    const startsWith = compileLikePattern(
      spellLikePattern("startsWith", "disk_"),
    );
    expect(startsWith("disk_a")).toBe(true);
    expect(startsWith("diskXa")).toBe(false);
    expect(startsWith("a disk_")).toBe(false);
  });
});
