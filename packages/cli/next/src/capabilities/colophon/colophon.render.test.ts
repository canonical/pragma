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

/** Run `body` with stdout's `isTTY` forced to `value`, then restore it. */
function withStdoutTty(value: boolean | undefined, body: () => void): void {
  const stream = process.stdout as { isTTY?: boolean };
  const saved = stream.isTTY;
  stream.isTTY = value;
  try {
    body();
  } finally {
    stream.isTTY = saved;
  }
}

describe("colophon render — color ON (attended TTY)", () => {
  it("plain emits ANSI escapes on a color-capable TTY", () => {
    chalk.level = 1;
    withStdoutTty(true, () => {
      // biome-ignore lint/suspicious/noControlCharactersInRegex: asserting the literal ESC byte is the point
      expect(colophonFormatters.plain(FIXTURE)).toMatch(/\x1b\[/);
    });
  });
});

describe("colophon render — piped output is ANSI-free (F1)", () => {
  it("plain emits ZERO ANSI off a TTY even when chalk reports color (CI/FORCE_COLOR)", () => {
    // The CI leak: `supports-color` sets a non-zero level off a TTY under
    // GITHUB_ACTIONS / FORCE_COLOR, so gating on `chalk.level` alone bled ANSI
    // into `colophon --format plain | tee`. The isTTY gate closes it.
    chalk.level = 3;
    withStdoutTty(undefined, () => {
      // biome-ignore lint/suspicious/noControlCharactersInRegex: asserting NO ESC byte survives
      expect(colophonFormatters.plain(FIXTURE)).not.toMatch(/\x1b\[/);
    });
  });
});
