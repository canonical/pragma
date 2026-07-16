import { describe, expect, it, vi } from "vitest";
import type { ToolSpec } from "../shared/ToolSpec.js";
import collectPrompts from "./collectPrompts.js";

const SPECS: ToolSpec[] = [
  {
    name: "thing_list",
    description: "List things.",
    readOnly: true,
    execute: async () => ({ data: [] }),
  },
];

const RUNTIME = {
  cwd: process.cwd(),
  config: { tier: undefined, channel: "normal" as const },
  packages: [],
};

const GOOD = {
  name: "good-prompt",
  description: "A good prompt.",
  template: "Do the thing.",
};

describe("collectPrompts", () => {
  it("validates bundled prompts and keeps registration order", async () => {
    const entries = await collectPrompts(RUNTIME, SPECS, [
      GOOD,
      { ...GOOD, name: "second-prompt" },
    ]);

    expect(entries.map((e) => e.definition.name)).toEqual([
      "good-prompt",
      "second-prompt",
    ]);
    expect(entries[0]?.source).toBe("bundled:good-prompt");
  });

  it("skips an invalid prompt with a stderr warning, not a boot failure", async () => {
    const stderr = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);

    try {
      const entries = await collectPrompts(RUNTIME, SPECS, [
        { name: "BadName", description: "x", template: "y" },
        GOOD,
      ]);

      expect(entries.map((e) => e.definition.name)).toEqual(["good-prompt"]);
      expect(stderr).toHaveBeenCalledWith(
        expect.stringContaining("Warning: skipping prompt"),
      );
    } finally {
      stderr.mockRestore();
    }
  });

  it("resolves duplicate names first-wins with a warning", async () => {
    const stderr = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);

    try {
      const entries = await collectPrompts(RUNTIME, SPECS, [
        GOOD,
        { ...GOOD, description: "Impostor." },
      ]);

      expect(entries).toHaveLength(1);
      expect(entries[0]?.definition.description).toBe("A good prompt.");
      expect(stderr).toHaveBeenCalledWith(
        expect.stringContaining("already provided"),
      );
    } finally {
      stderr.mockRestore();
    }
  });

  it("validates the real bundled catalog against a spec production containing its tools", async () => {
    // The four D6 prompts need these tools registered.
    const production: ToolSpec[] = [
      "ontology_list",
      "block_sample",
      "block_list",
      "block_lookup",
      "standard_list",
    ].map((name) => ({
      name,
      description: "stub",
      params: {
        names: { type: "string[]", description: "n", optional: true },
        detail: {
          type: "string",
          description: "d",
          optional: true,
          enum: ["summary", "detailed"],
        },
        category: { type: "string", description: "c", optional: true },
      },
      readOnly: true,
      execute: async () => ({ data: [] }),
    }));

    const entries = await collectPrompts(RUNTIME, production);

    expect(entries.map((e) => e.definition.name)).toEqual([
      "implement-component",
      "audit-code",
      "explore-graph",
      "fix-empty-results",
    ]);
  });
});
