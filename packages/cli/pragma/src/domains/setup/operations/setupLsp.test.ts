import { collectEffects, dryRun } from "@canonical/task";
import { describe, expect, it } from "vitest";
import setupLsp from "./setupLsp.js";

describe("setupLsp", () => {
  it("produces an exec effect for bunx", () => {
    const result = dryRun(setupLsp("/project"));
    const execs = result.effects.filter((e) => e._tag === "Exec");
    expect(execs).toHaveLength(1);
    expect(execs[0]).toMatchObject({
      _tag: "Exec",
      command: "bunx",
      args: ["@canonical/terrazzo-lsp-extension"],
      cwd: "/project",
    });
  });

  it("logs info messages before and after exec", () => {
    const result = dryRun(setupLsp("/project"));
    const logs = result.effects.filter((e) => e._tag === "Log");
    expect(logs.some((l) => l.message.includes("Installing"))).toBe(true);
    expect(logs.some((l) => l.message.includes("✓"))).toBe(true);
  });

  it("collects effects without execution", () => {
    const effects = collectEffects(setupLsp("/project"));
    expect(effects.length).toBeGreaterThan(0);
  });
});
