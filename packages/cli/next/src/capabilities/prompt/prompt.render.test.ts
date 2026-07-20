import { describe, expect, it } from "vitest";
import {
  promptListFormatters,
  promptLookupFormatters,
} from "./prompt.render.js";
import type { PromptListData, PromptLookupData } from "./types.js";

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
