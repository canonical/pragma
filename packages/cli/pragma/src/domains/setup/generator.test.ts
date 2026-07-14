import { dryRun } from "@canonical/task";
import { describe, expect, it } from "vitest";
import buildSetupCommand from "./commands/setup.js";
import { setupGenerator } from "./generator.js";

describe("setupGenerator", () => {
  it("exposes a confirm prompt for each environment step", () => {
    const names = setupGenerator.prompts.map((p) => p.name);
    expect(names).toEqual(["withCompletions", "withLsp", "withMcp"]);
    for (const prompt of setupGenerator.prompts) {
      expect(prompt.type).toBe("confirm");
      expect(prompt.default).toBe(true);
    }
  });

  it("skips every step when all toggles are off", () => {
    const task = setupGenerator.generate({
      root: "/tmp/project",
      withCompletions: false,
      withLsp: false,
      withMcp: false,
    });
    const { effects } = dryRun(task);
    // Only the framing Info effects remain; no file/exec effects.
    expect(effects.some((e) => e._tag === "WriteFile")).toBe(false);
    expect(effects.some((e) => e._tag === "Exec")).toBe(false);
  });

  it("includes the completions write when that step is enabled", () => {
    const task = setupGenerator.generate({
      root: "/tmp/project",
      withCompletions: true,
      withLsp: false,
      withMcp: false,
    });
    const { effects } = dryRun(task);
    expect(effects.some((e) => e._tag === "WriteFile")).toBe(true);
  });
});

describe("buildSetupCommand", () => {
  it("registers as the top-level `setup` command", () => {
    const cmd = buildSetupCommand();
    expect(cmd.path).toEqual(["setup"]);
  });

  it("derives disable flags from the generator's confirm prompts", () => {
    const cmd = buildSetupCommand();
    const flagNames = cmd.parameters.map((p) => p.name);
    expect(flagNames).toContain("withCompletions");
    expect(flagNames).toContain("withLsp");
    expect(flagNames).toContain("withMcp");
    expect(flagNames).toContain("dryRun");
    expect(flagNames).toContain("yes");
  });
});
