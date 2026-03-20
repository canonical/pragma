import { collectEffects, dryRun } from "@canonical/task";
import { describe, expect, it } from "vitest";
import setupAll from "./setupAll.js";

describe("setupAll", () => {
  it("produces prompt effects for each step", () => {
    const result = dryRun(setupAll("/project"));
    const prompts = result.effects.filter((e) => e._tag === "Prompt");

    // At least 3 top-level prompts: completions, lsp, mcp
    expect(prompts.length).toBeGreaterThanOrEqual(3);
  });

  it("includes setup header in log output", () => {
    const result = dryRun(setupAll("/project"));
    const logs = result.effects.filter((e) => e._tag === "Log");
    expect(logs.some((l) => l.message.includes("Setting up pragma"))).toBe(
      true,
    );
  });

  it("includes completion message at end", () => {
    const result = dryRun(setupAll("/project"));
    const logs = result.effects.filter((e) => e._tag === "Log");
    expect(logs.some((l) => l.message.includes("Setup complete"))).toBe(true);
  });

  it("runs steps in sequence (completions, lsp, mcp)", () => {
    const result = dryRun(setupAll("/project"));
    const logs = result.effects.filter((e) => e._tag === "Log");
    const messages = logs.map((l) => l.message);

    const completionsIdx = messages.findIndex((m) =>
      m.includes("1. Shell completions"),
    );
    const lspIdx = messages.findIndex((m) => m.includes("2. LSP"));
    const mcpIdx = messages.findIndex((m) => m.includes("3. MCP"));

    expect(completionsIdx).toBeGreaterThanOrEqual(0);
    expect(lspIdx).toBeGreaterThan(completionsIdx);
    expect(mcpIdx).toBeGreaterThan(lspIdx);
  });

  it("collects effects without execution", () => {
    const effects = collectEffects(setupAll("/project"));
    expect(effects.length).toBeGreaterThan(0);
  });
});
