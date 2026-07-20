import { describe, expect, it } from "vitest";
import {
  MAX_PROGRESS_LINE,
  TRUNCATION_MARKER,
  truncateMiddle,
} from "./progressWindow.js";

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
});
