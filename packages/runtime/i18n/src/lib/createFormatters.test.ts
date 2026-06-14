import { describe, expect, it } from "vitest";
import createFormatters from "./createFormatters.js";

describe("createFormatters", () => {
  const en = createFormatters("en-US");

  it("formats numbers and currency", () => {
    expect(en.number(1234.5)).toBe("1,234.5");
    expect(en.currency(1234.5, "USD")).toBe("$1,234.50");
  });

  it("formats dates and times", () => {
    const date = new Date(Date.UTC(2026, 0, 15, 9, 5));
    expect(en.date(date, { dateStyle: "medium", timeZone: "UTC" })).toBe(
      "Jan 15, 2026",
    );
    expect(typeof en.time(date, { timeZone: "UTC" })).toBe("string");
  });

  it("formats relative time and lists", () => {
    expect(en.relativeTime(-3, "day", { numeric: "auto" })).toBe("3 days ago");
    expect(en.list(["A", "B", "C"])).toBe("A, B, and C");
  });

  it("uses default options when none are given", () => {
    expect(typeof en.time(0)).toBe("string");
    expect(typeof en.date(0)).toBe("string");
  });

  it("produces locale-specific output", () => {
    const fr = createFormatters("fr-FR");
    expect(fr.number(1234.5)).not.toBe(en.number(1234.5));
  });

  it("reuses memoized formatters across repeated identical options", () => {
    const formatters = createFormatters("en-US");
    // The second call with the same options resolves the cached instance.
    expect(formatters.number(1000)).toBe(formatters.number(1000));
    expect(formatters.number(1000)).toBe("1,000");
    expect(formatters.currency(5, "USD")).toBe(formatters.currency(5, "USD"));
    expect(formatters.currency(5, "USD")).toBe("$5.00");
  });
});
