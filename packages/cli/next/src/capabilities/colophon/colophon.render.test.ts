/**
 * Render golden for `pragma colophon`.
 *
 * Forces `chalk.level = 0` for a deterministic, color-free proof of the plain
 * Markdown→terminal styling (headings, bullets, inline `**bold**`/`` `code` ``
 * consumed) and the llm condensed passthrough (`summary ?? markdown`, no color),
 * plus one assertion that color-ON emits an ANSI escape. This is the
 * "human-styled / condensed-for-llm" render model in one file.
 */

import chalk from "chalk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { colophonFormatters } from "./colophon.render.js";
import type { ColophonData } from "./types.js";

/** A tiny, fixed two-section fixture (double-quoted so backticks stay literal). */
const FIXTURE: ColophonData = {
  sections: [
    {
      kind: "pragma",
      title: "pragma",
      markdown: "How it is **made**.\n\n## Effects\n- describe\n- interpret",
      summary: "condensed",
      source: "built-in",
    },
    {
      kind: "pack",
      title: "block",
      markdown: "The `ds:` domain.",
      source: "pack:block",
    },
  ],
};

let prevLevel: number;
beforeAll(() => {
  prevLevel = chalk.level;
});
afterAll(() => {
  chalk.level = prevLevel;
});

describe("colophon render golden — color-free (chalk.level = 0)", () => {
  it("plain styles the title/heading/bullets and consumes inline markers", () => {
    chalk.level = 0;
    const expected = [
      "pragma",
      "",
      "How it is made.",
      "",
      "Effects",
      "  • describe",
      "  • interpret",
      "",
      "block",
      "",
      "The ds: domain.",
    ].join("\n");
    expect(colophonFormatters.plain(FIXTURE)).toBe(expected);
  });

  it("llm emits condensed Markdown (summary preferred, no color)", () => {
    chalk.level = 0;
    const expected = [
      "## pragma",
      "",
      "condensed",
      "",
      "## block",
      "",
      "The `ds:` domain.",
    ].join("\n");
    expect(colophonFormatters.llm(FIXTURE)).toBe(expected);
  });

  it("json is the exact ColophonData round-trip", () => {
    expect(JSON.parse(colophonFormatters.json(FIXTURE))).toEqual(FIXTURE);
  });
});

describe("colophon render — color ON", () => {
  it("plain emits ANSI escapes when chalk color is enabled", () => {
    chalk.level = 1;
    // biome-ignore lint/suspicious/noControlCharactersInRegex: asserting the literal ESC byte is the point
    expect(colophonFormatters.plain(FIXTURE)).toMatch(/\x1b\[/);
  });
});
