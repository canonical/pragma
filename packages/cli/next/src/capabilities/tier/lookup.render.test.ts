import chalk from "chalk";
import { afterEach, describe, expect, it } from "vitest";
import { type TierLookupData, tierLookupFormatters } from "./lookup.render.js";

const TIER: TierLookupData = {
  uri: "cs:apps/lxd-panel",
  name: "apps/lxd-panel",
  blocks: ["LXD Panel", "Status Bar"],
};

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

describe("tierLookupFormatters", () => {
  it("underlines the plain title with an ═ rule (B7)", () => {
    const [title, rule, blank, blocks] = tierLookupFormatters
      .plain(TIER)
      .split("\n");
    expect(title).toBe("apps/lxd-panel (cs:apps/lxd-panel)");
    expect(rule).toBe("═".repeat(Math.max((title as string).length, 24)));
    expect(blank).toBe("");
    expect(blocks).toBe("  blocks: LXD Panel, Status Bar");
  });

  it("floors the plain rule at 24 columns for a short title", () => {
    const out = tierLookupFormatters.plain({ ...TIER, uri: "x", name: "a" });
    expect(out.split("\n").at(1)).toBe("═".repeat(24));
  });

  it("heads the llm entity read at H2, never H1 (B2)", () => {
    const out = tierLookupFormatters.llm(TIER);
    expect(out.startsWith("## apps/lxd-panel\n")).toBe(true);
    expect(out).not.toMatch(/^# /m);
  });
});

describe("tierLookupFormatters — shared style seam (B7)", () => {
  const prevLevel = chalk.level;
  afterEach(() => {
    chalk.level = prevLevel;
  });

  it("styles the plain title on a color-capable TTY (single-sourced frame)", () => {
    chalk.level = 1;
    withStdoutTty(true, () => {
      // Delegating to `renderLookupPlain` now carries the same TTY tint block and
      // skill lookups get — previously the tier title stayed unstyled.
      // biome-ignore lint/suspicious/noControlCharactersInRegex: asserting the ESC byte is the point
      expect(tierLookupFormatters.plain(TIER)).toMatch(/\x1b\[/);
    });
  });

  it("keeps piped plain output byte-stable off a TTY", () => {
    chalk.level = 3;
    withStdoutTty(undefined, () => {
      const out = tierLookupFormatters.plain(TIER);
      // biome-ignore lint/suspicious/noControlCharactersInRegex: asserting NO ESC byte survives
      expect(out).not.toMatch(/\x1b\[/);
      expect(out.split("\n").at(0)).toBe("apps/lxd-panel (cs:apps/lxd-panel)");
      expect(out.split("\n").at(3)).toBe("  blocks: LXD Panel, Status Bar");
    });
  });
});
