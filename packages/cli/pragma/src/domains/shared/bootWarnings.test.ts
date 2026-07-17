import { afterEach, describe, expect, it } from "vitest";
import {
  clearBootWarnings,
  drainBootWarnings,
  recordBootWarning,
  renderBootWarnings,
} from "./bootWarnings.js";

afterEach(() => clearBootWarnings());

const warning = (subject: string) => ({
  kind: "malformed-graph" as const,
  subject,
  detail: "Parser error at line 1",
});

describe("bootWarnings", () => {
  it("records and drains warnings", () => {
    recordBootWarning(warning("/data/a.ttl"));
    recordBootWarning(warning("/data/b.ttl"));
    const drained = drainBootWarnings();
    expect(drained.map((w) => w.subject)).toEqual([
      "/data/a.ttl",
      "/data/b.ttl",
    ]);
    // Draining empties the accumulator.
    expect(drainBootWarnings()).toEqual([]);
  });

  it("deduplicates by subject", () => {
    recordBootWarning(warning("/data/a.ttl"));
    recordBootWarning(warning("/data/a.ttl"));
    expect(drainBootWarnings()).toHaveLength(1);
  });

  it("renders nothing when there are no warnings", () => {
    expect(renderBootWarnings([], false)).toBe("");
    expect(renderBootWarnings([], true)).toBe("");
  });

  it("renders a single summary line by default", () => {
    const text = renderBootWarnings(
      [warning("/data/a.ttl"), warning("/data/b.ttl")],
      false,
    );
    expect(text.trimEnd().split("\n")).toHaveLength(1);
    expect(text).toContain("skipped 2 malformed data sources");
    expect(text).toContain("a.ttl, b.ttl");
    expect(text).toContain("pragma doctor");
  });

  it("elides beyond three file names in the summary", () => {
    const text = renderBootWarnings(
      [
        warning("/a.ttl"),
        warning("/b.ttl"),
        warning("/c.ttl"),
        warning("/d.ttl"),
      ],
      false,
    );
    expect(text).toContain("(+1 more)");
    expect(text).not.toContain("d.ttl");
  });

  it("renders one full line per warning under verbose", () => {
    const text = renderBootWarnings(
      [warning("/data/a.ttl"), warning("/data/b.ttl")],
      true,
    );
    expect(text.trimEnd().split("\n")).toHaveLength(2);
    expect(text).toContain('skipping malformed graph "/data/a.ttl"');
    expect(text).toContain("Parser error at line 1");
    expect(text).toContain("Check the TTL syntax");
  });
});
