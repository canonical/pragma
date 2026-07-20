import { describe, expect, it } from "vitest";
import {
  MAX_PROGRESS_LINE,
  measureDisplayWidth,
  TRUNCATION_MARKER,
  truncateMiddle,
} from "./progressWindow.js";

/** Whether any code unit in `text` is an unpaired surrogate (a broken glyph). */
const hasLoneSurrogate = (text: string): boolean =>
  [...text].some((char) => {
    const codePoint = char.codePointAt(0) ?? 0;
    return codePoint >= 0xd800 && codePoint <= 0xdfff;
  });

describe("truncateMiddle", () => {
  it("leaves a line within the cap untouched", () => {
    const line = "Write file: a.ts (3 bytes)";
    expect(truncateMiddle(line)).toBe(line);
  });

  it("leaves a line exactly at the cap untouched", () => {
    const line = "x".repeat(MAX_PROGRESS_LINE);
    expect(truncateMiddle(line)).toBe(line);
  });

  it("middle-truncates an over-long line to the cap, keeping both ends", () => {
    const line = `Write file: ${"deep/".repeat(40)}Component.tsx (999 bytes)`;
    const out = truncateMiddle(line);
    expect(out.length).toBe(MAX_PROGRESS_LINE);
    expect(out).toContain(TRUNCATION_MARKER);
    // Both the verb prefix and the identifying tail survive.
    expect(out.startsWith("Write file: ")).toBe(true);
    expect(out.endsWith("(999 bytes)")).toBe(true);
  });

  it("honours a custom max width", () => {
    const out = truncateMiddle("abcdefghijklmnop", 9);
    expect(out.length).toBe(9);
    expect(out).toContain(TRUNCATION_MARKER);
    expect(out.startsWith("abcd")).toBe(true);
    expect(out.endsWith("mnop")).toBe(true);
  });

  it("degrades to a head-plus-marker at a tiny max (no tail budget)", () => {
    // max 2 → 1 marker col + 1 head col, 0 tail cols.
    expect(truncateMiddle("abcdef", 2)).toBe(`a${TRUNCATION_MARKER}`);
  });

  it("never splits a supplementary-plane emoji into a lone surrogate", () => {
    // A boundary that would fall mid-emoji under UTF-16 `slice()`.
    const line = `Write file: ${"🎉".repeat(30)} (done)`;
    const out = truncateMiddle(line, 20);
    expect(hasLoneSurrogate(out)).toBe(false);
    expect(out).toContain(TRUNCATION_MARKER);
    // Cut by display width, not code units: an emoji is two columns wide.
    expect(measureDisplayWidth(out)).toBeLessThanOrEqual(20);
  });

  it("keeps a wide (CJK) line within the DISPLAY-width cap so it will not wrap", () => {
    // 40 CJK glyphs: each is one UTF-16 unit but TWO terminal columns, so a
    // code-unit cap would under-count and let the row wrap.
    const line = `Write file: ${"字".repeat(40)}.ts`;
    const out = truncateMiddle(line, 24);
    expect(measureDisplayWidth(out)).toBeLessThanOrEqual(24);
    expect(out).toContain(TRUNCATION_MARKER);
    expect(hasLoneSurrogate(out)).toBe(false);
  });
});

describe("measureDisplayWidth", () => {
  it("counts an ASCII string by its length", () => {
    expect(measureDisplayWidth("hello")).toBe(5);
    expect(measureDisplayWidth("")).toBe(0);
  });

  it("counts a CJK (wide) code point as two columns", () => {
    expect(measureDisplayWidth("字")).toBe(2);
    expect(measureDisplayWidth("日本語")).toBe(6);
  });

  it("counts a supplementary-plane emoji as two columns, not two code units", () => {
    // One code point (two UTF-16 units) → two columns, not `.length` (2) × 1.
    expect("🎉".length).toBe(2);
    expect(measureDisplayWidth("🎉")).toBe(2);
  });
});
