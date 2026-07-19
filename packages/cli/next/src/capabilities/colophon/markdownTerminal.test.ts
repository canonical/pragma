/**
 * `markdownTerminal` — the tiny Markdown→terminal styler for `pragma colophon`.
 *
 * Forces `chalk.level = 0` for deterministic, color-free assertions. Focuses on
 * the control-char scrub (F4): the colophon body is domain-as-data (pack
 * authored), so a hostile/careless pack must not smuggle raw ANSI escapes or C0
 * control bytes to the terminal through it — every line is scrubbed BEFORE our
 * own chalk styling. Also pins that clean Markdown still styles as before.
 */

import chalk from "chalk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { renderMarkdownToTerminal } from "./markdownTerminal.js";

let prevLevel: number;
beforeAll(() => {
  prevLevel = chalk.level;
  chalk.level = 0;
});
afterAll(() => {
  chalk.level = prevLevel;
});

describe("markdownTerminal — strips pack-authored control codes (F4)", () => {
  it("removes ANSI escapes and stray C0/DEL controls before styling", () => {
    // One hostile line: SGR colour codes, a NUL, a BEL, a CSI screen-clear, and
    // a lone ESC — all wrapped around real text.
    const hostile = "safe\x1b[31mRED\x1b[0m\x00\x07 text\x1b[2J\x1bmore";
    const out = renderMarkdownToTerminal(hostile);
    // The control codes are gone; the visible text survives verbatim.
    expect(out).toBe("safeRED textmore");
    // Belt and braces: not a single C0/DEL control byte remains.
    // biome-ignore lint/suspicious/noControlCharactersInRegex: asserting the scrub removed control bytes
    expect(out).not.toMatch(/[\x00-\x08\x0b-\x1f\x7f]/);
  });

  it("scrubs control codes hidden inside a fenced code block too", () => {
    const out = renderMarkdownToTerminal("```\nrm -rf /\x1b[2K\x07\n```");
    // biome-ignore lint/suspicious/noControlCharactersInRegex: asserting the scrub removed control bytes
    expect(out).not.toMatch(/[\x00-\x08\x0b-\x1f\x7f]/);
    expect(out).toContain("rm -rf /");
  });

  it("preserves the structural styling for clean Markdown", () => {
    // Heading + bullet + inline markers still render exactly as before the scrub.
    expect(renderMarkdownToTerminal("# Title\n- an **item** with `code`")).toBe(
      ["Title", "  • an item with code"].join("\n"),
    );
  });
});
