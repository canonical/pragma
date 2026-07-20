import chalk from "chalk";
import { afterEach, describe, expect, it } from "vitest";
import {
  promptListFormatters,
  promptLookupFormatters,
} from "./prompt.render.js";
import type { PromptListData, PromptLookupData } from "./types.js";

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

const LOOKUP: PromptLookupData = {
  name: "build-a-block",
  description: "Scaffold a block",
  arguments: [
    { name: "blockName", required: true, description: "The block name" },
    { name: "tier", required: false },
  ],
  body: "Create {{blockName}} in {{tier}}.",
};

const LIST: PromptListData = {
  prompts: [
    { name: "build-a-block", description: "Scaffold a block", arguments: [] },
  ],
};

describe("promptLookupFormatters", () => {
  it("underlines the plain name with an ═ rule (B7)", () => {
    const lines = promptLookupFormatters.plain(LOOKUP).split("\n");
    expect(lines.at(0)).toBe("build-a-block");
    expect(lines.at(1)).toBe("═".repeat(24));
    expect(lines.at(2)).toBe("");
    expect(lines).toContain("  args: blockName (required), tier");
  });

  it("heads the llm entity at H2 with H3 sub-sections (B2)", () => {
    const lines = promptLookupFormatters.llm(LOOKUP).split("\n");
    expect(lines.at(0)).toBe("## build-a-block");
    expect(lines).toContain("### Arguments");
    expect(lines).toContain("### Template");
    // The old H1 title / H2 sub-sections are gone.
    expect(lines).not.toContain("# build-a-block");
    expect(lines).not.toContain("## Arguments");
    expect(lines).not.toContain("## Template");
  });
});

describe("promptListFormatters", () => {
  it("heads the llm list at H2, never H1 (B2)", () => {
    const out = promptListFormatters.llm(LIST);
    expect(out.startsWith("## Prompts")).toBe(true);
    expect(out).not.toMatch(/^# Prompts/m);
  });
});

describe("promptLookupFormatters — shared style seam (B7)", () => {
  const prevLevel = chalk.level;
  afterEach(() => {
    chalk.level = prevLevel;
  });

  it("styles the plain title on a color-capable TTY", () => {
    chalk.level = 1;
    withStdoutTty(true, () => {
      // The title/rule/label now route through the same style seam block and
      // skill lookups use — previously a prompt title stayed unstyled on a TTY.
      // biome-ignore lint/suspicious/noControlCharactersInRegex: asserting the ESC byte is the point
      expect(promptLookupFormatters.plain(LOOKUP)).toMatch(/\x1b\[/);
    });
  });

  it("keeps piped plain output byte-stable off a TTY", () => {
    chalk.level = 3;
    withStdoutTty(undefined, () => {
      const out = promptLookupFormatters.plain(LOOKUP);
      // biome-ignore lint/suspicious/noControlCharactersInRegex: asserting NO ESC byte survives
      expect(out).not.toMatch(/\x1b\[/);
      const lines = out.split("\n");
      expect(lines.at(0)).toBe("build-a-block");
      expect(lines.at(1)).toBe("═".repeat(24));
      expect(lines).toContain("  args: blockName (required), tier");
    });
  });
});
