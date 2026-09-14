import { describe, expect, it } from "vitest";
import { formatValidOptions, MAX_LISTED_OPTIONS } from "./validOptions.js";

/** `count` option names, distinct and ordered. */
function options(count: number): string[] {
  return Array.from({ length: count }, (_, index) => `option-${index}`);
}

describe("formatValidOptions", () => {
  it("names every option when the vocabulary is a choice", () => {
    // Every real filter at or below the cap renders in full: the type filter
    // at 7, the tier filter at 16, the coordinate set at 36.
    const line = formatValidOptions(["color", "dimension", "duration"]);

    expect(line).toBe("Valid options: color, dimension, duration");
  });

  it("names every option at exactly the cap", () => {
    const line = formatValidOptions(options(MAX_LISTED_OPTIONS));

    expect(line).toContain(`option-${MAX_LISTED_OPTIONS - 1}`);
    expect(line).not.toContain("more");
  });

  it("withholds the tail one past the cap, and counts it", () => {
    const line = formatValidOptions(options(MAX_LISTED_OPTIONS + 1));

    expect(line).toContain(`(${MAX_LISTED_OPTIONS + 1})`);
    expect(line).toContain("and 1 more");
    expect(line).not.toContain(`option-${MAX_LISTED_OPTIONS}`);
  });

  it("keeps a catalogue-sized vocabulary to a readable line", () => {
    // The case that forced this: the variable filter's vocabulary is 1,156
    // names, and naming them all rendered roughly 90KB — unreadable in a
    // terminal, and large enough over MCP to threaten the payload budget.
    const line = formatValidOptions(options(1156));

    expect(line).toContain("(1156)");
    expect(line).toContain("and 1116 more");
    expect(line.length).toBeLessThan(2000);
  });

  it("carries a caller's own prefix", () => {
    // The prefix seam is how a caller that renders its OWN options line names
    // the flag. Nothing in the error path passes one any more: the renderers
    // print the vocabulary once, from `validOptions`, and a recovery that
    // enumerated it too printed the same catalogue twice.
    const line = formatValidOptions(
      options(1156),
      "Values allowed for --variable",
    );

    expect(line.startsWith("Values allowed for --variable (1156)")).toBe(true);
    expect(line.length).toBeLessThan(2000);
  });
});
