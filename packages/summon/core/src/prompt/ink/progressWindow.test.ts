import { describe, expect, it } from "vitest";
import {
  describedWidthBudget,
  formatEffectDuration,
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

describe("formatEffectDuration", () => {
  it("spells a duration exactly as the summon binary's timed view does", () => {
    expect(formatEffectDuration(12)).toBe("(12ms)");
  });

  it("rounds to whole milliseconds", () => {
    // The interpreter measures with `performance.now()`, so the value arrives
    // fractional; a progress line is not a benchmark.
    expect(formatEffectDuration(3.7)).toBe("(4ms)");
    expect(formatEffectDuration(0.2)).toBe("(0ms)");
  });
});

describe("describedWidthBudget", () => {
  it("reserves the suffix AND the space before it out of the cap", () => {
    const suffix = formatEffectDuration(12); // "(12ms)" — 6 columns
    expect(describedWidthBudget(suffix)).toBe(MAX_PROGRESS_LINE - 7);
  });

  it("keeps description + space + suffix within the one-row cap", () => {
    // The case the budget exists for: a description that already fills the cap.
    const suffix = formatEffectDuration(1234);
    const described = truncateMiddle(
      `Write file: ${"deep/".repeat(40)}Component.tsx (999 bytes)`,
      describedWidthBudget(suffix),
    );
    expect(measureDisplayWidth(`${described} ${suffix}`)).toBeLessThanOrEqual(
      MAX_PROGRESS_LINE,
    );
  });

  it("honours a custom cap and never goes negative", () => {
    expect(describedWidthBudget("(12ms)", 20)).toBe(13);
    expect(describedWidthBudget("(123456ms)", 4)).toBe(0);
  });
});
