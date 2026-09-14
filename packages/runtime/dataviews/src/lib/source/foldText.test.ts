import { describe, expect, it } from "vitest";
import foldText from "./foldText.js";

describe("foldText", () => {
  it("lowercases without a locale", () => {
    expect(foldText("WEB-01")).toBe("web-01");
    expect(foldText("ÉCOLE")).toBe("école");
  });

  it("finds a decomposed accent as its composed form", () => {
    expect(foldText("École")).toBe(foldText("École"));
  });

  it("reads a final sigma as a sigma, so a word's start is found in a longer word", () => {
    expect(foldText("ΟΔΟΣ")).toBe("οδοσ");
    expect(foldText("ΟΔΟΣΤΡΩΜΑ").includes(foldText("ΟΔΟΣ"))).toBe(true);
  });

  it("composes again after lowercasing", () => {
    expect(foldText("T̈")).toBe("ẗ");
    expect(foldText("\u{10400}")).toBe("\u{10428}");
  });

  it("lowercases ASCII text exactly as the full fold would", () => {
    const foldFully = (text: string): string =>
      text.normalize("NFC").toLowerCase().replaceAll("ς", "σ").normalize("NFC");
    const ascii = Array.from({ length: 128 }, (_, code) =>
      String.fromCharCode(code),
    ).join("");
    for (const text of [ascii, "WEB-01.EXAMPLE.COM", "50% full_\\", ""]) {
      expect(foldText(text)).toBe(foldFully(text));
    }
  });

  it("expands no letter into a spelling of it", () => {
    expect(foldText("Straße")).toBe("straße");
    expect(foldText("STRASSE")).not.toBe(foldText("Straße"));
  });
});
