import { describe, expect, it, vi } from "vitest";

vi.mock("./checks/index.js", () => ({
  checkNodeVersion: vi.fn(),
  checkPragmaVersion: vi.fn(),
  checkConfigFile: vi.fn(),
  checkPackageRefs: vi.fn(),
  checkKeStore: vi.fn(),
  checkShellCompletions: vi.fn(),
  checkMcpConfigured: vi.fn(),
  checkMcpCommands: vi.fn(),
  checkSkillsSymlinked: vi.fn(),
}));

import {
  checkConfigFile,
  checkKeStore,
  checkMcpCommands,
  checkMcpConfigured,
  checkNodeVersion,
  checkPackageRefs,
  checkPragmaVersion,
  checkShellCompletions,
  checkSkillsSymlinked,
} from "./checks/index.js";
import runChecks from "./runChecks.js";
import type { CheckResult } from "./types.js";

const pass = (name: string) => ({
  name,
  status: "pass" as const,
  detail: "ok",
});
const fail = (name: string) => ({
  name,
  status: "fail" as const,
  detail: "bad",
  remedy: "fix it",
});
const skip = (name: string) => ({
  name,
  status: "skip" as const,
  detail: "skipped",
});

describe("runChecks", () => {
  it("returns correct counts when all pass", async () => {
    vi.mocked(checkNodeVersion).mockResolvedValue(pass("Node"));
    vi.mocked(checkPragmaVersion).mockResolvedValue(pass("pragma"));
    vi.mocked(checkConfigFile).mockResolvedValue(pass("config"));
    vi.mocked(checkPackageRefs).mockResolvedValue(pass("refs"));
    vi.mocked(checkKeStore).mockResolvedValue(pass("store"));
    vi.mocked(checkShellCompletions).mockResolvedValue(pass("completions"));
    vi.mocked(checkMcpConfigured).mockResolvedValue(pass("mcp"));
    vi.mocked(checkMcpCommands).mockResolvedValue(pass("mcp commands"));
    vi.mocked(checkSkillsSymlinked).mockResolvedValue(pass("skills"));

    const data = await runChecks({ cwd: "/test" });
    expect(data.passed).toBe(9);
    expect(data.failed).toBe(0);
    expect(data.skipped).toBe(0);
    expect(data.checks).toHaveLength(9);
  });

  it("counts failures and skips correctly", async () => {
    vi.mocked(checkNodeVersion).mockResolvedValue(pass("Node"));
    vi.mocked(checkPragmaVersion).mockResolvedValue(pass("pragma"));
    vi.mocked(checkConfigFile).mockResolvedValue(fail("config"));
    vi.mocked(checkPackageRefs).mockResolvedValue(pass("refs"));
    vi.mocked(checkKeStore).mockResolvedValue(fail("store"));
    vi.mocked(checkShellCompletions).mockResolvedValue(fail("completions"));
    vi.mocked(checkMcpConfigured).mockResolvedValue(pass("mcp"));
    vi.mocked(checkMcpCommands).mockResolvedValue(pass("mcp commands"));
    vi.mocked(checkSkillsSymlinked).mockResolvedValue(skip("skills"));

    const data = await runChecks({ cwd: "/test" });
    expect(data.passed).toBe(5);
    expect(data.failed).toBe(3);
    expect(data.skipped).toBe(1);
  });

  it("preserves check order", async () => {
    vi.mocked(checkNodeVersion).mockResolvedValue(pass("Node"));
    vi.mocked(checkPragmaVersion).mockResolvedValue(pass("pragma"));
    vi.mocked(checkConfigFile).mockResolvedValue(pass("config"));
    vi.mocked(checkPackageRefs).mockResolvedValue(pass("refs"));
    vi.mocked(checkKeStore).mockResolvedValue(pass("store"));
    vi.mocked(checkShellCompletions).mockResolvedValue(pass("completions"));
    vi.mocked(checkMcpConfigured).mockResolvedValue(pass("mcp"));
    vi.mocked(checkMcpCommands).mockResolvedValue(pass("mcp commands"));
    vi.mocked(checkSkillsSymlinked).mockResolvedValue(pass("skills"));

    const data = await runChecks({ cwd: "/test" });
    expect(data.checks[0].name).toBe("Node");
    expect(data.checks[1].name).toBe("pragma");
    expect(data.checks[2].name).toBe("config");
    expect(data.checks[3].name).toBe("refs");
    expect(data.checks[4].name).toBe("store");
    expect(data.checks[8].name).toBe("skills");
  });

  it("preserves order even when checks resolve out of order", async () => {
    const delayed = (result: CheckResult, ms: number) =>
      new Promise<CheckResult>((resolve) =>
        setTimeout(() => resolve(result), ms),
      );

    // Resolve the first check slowest and the last fastest to prove the report
    // order follows declaration order, not completion order.
    vi.mocked(checkNodeVersion).mockReturnValue(delayed(pass("Node"), 30));
    vi.mocked(checkPragmaVersion).mockResolvedValue(pass("pragma"));
    vi.mocked(checkConfigFile).mockResolvedValue(pass("config"));
    vi.mocked(checkPackageRefs).mockResolvedValue(pass("refs"));
    vi.mocked(checkKeStore).mockResolvedValue(pass("store"));
    vi.mocked(checkShellCompletions).mockResolvedValue(pass("completions"));
    vi.mocked(checkMcpConfigured).mockResolvedValue(pass("mcp"));
    vi.mocked(checkMcpCommands).mockResolvedValue(pass("mcp commands"));
    vi.mocked(checkSkillsSymlinked).mockReturnValue(delayed(pass("skills"), 0));

    const data = await runChecks({ cwd: "/test" });
    expect(data.checks.map((c) => c.name)).toEqual([
      "Node",
      "pragma",
      "config",
      "refs",
      "store",
      "completions",
      "mcp",
      "mcp commands",
      "skills",
    ]);
  });

  it("surfaces a thrown check as an attributable fail instead of aborting", async () => {
    vi.mocked(checkNodeVersion).mockResolvedValue(pass("Node"));
    vi.mocked(checkPragmaVersion).mockResolvedValue(pass("pragma"));
    vi.mocked(checkConfigFile).mockRejectedValue(new Error("disk on fire"));
    vi.mocked(checkPackageRefs).mockResolvedValue(pass("refs"));
    vi.mocked(checkKeStore).mockResolvedValue(pass("store"));
    vi.mocked(checkShellCompletions).mockResolvedValue(pass("completions"));
    vi.mocked(checkMcpConfigured).mockResolvedValue(pass("mcp"));
    vi.mocked(checkMcpCommands).mockResolvedValue(pass("mcp commands"));
    vi.mocked(checkSkillsSymlinked).mockResolvedValue(pass("skills"));

    const data = await runChecks({ cwd: "/test" });

    // The whole run still completes; the thrown check becomes a fail in place.
    expect(data.checks).toHaveLength(9);
    expect(data.passed).toBe(8);
    expect(data.failed).toBe(1);
    const failed = data.checks[2];
    expect(failed.status).toBe("fail");
    // Fallback name matches checkConfigFile's own `name` so a thrown check
    // reports the same label as a normal pass/fail.
    expect(failed.name).toBe("pragma.config.json");
    expect(failed.detail).toContain("disk on fire");
    expect(failed.remedy).toBeDefined();
  });

  it("handles a non-Error rejection without crashing", async () => {
    vi.mocked(checkNodeVersion).mockResolvedValue(pass("Node"));
    vi.mocked(checkPragmaVersion).mockResolvedValue(pass("pragma"));
    vi.mocked(checkConfigFile).mockResolvedValue(pass("config"));
    vi.mocked(checkPackageRefs).mockResolvedValue(pass("refs"));
    vi.mocked(checkKeStore).mockRejectedValue("string failure");
    vi.mocked(checkShellCompletions).mockResolvedValue(pass("completions"));
    vi.mocked(checkMcpConfigured).mockResolvedValue(pass("mcp"));
    vi.mocked(checkMcpCommands).mockResolvedValue(pass("mcp commands"));
    vi.mocked(checkSkillsSymlinked).mockResolvedValue(pass("skills"));

    const data = await runChecks({ cwd: "/test" });
    expect(data.failed).toBe(1);
    expect(data.checks[4].name).toBe("ke store");
    expect(data.checks[4].detail).toContain("string failure");
  });
});
