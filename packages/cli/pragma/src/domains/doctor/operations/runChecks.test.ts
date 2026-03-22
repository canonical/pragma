import { describe, expect, it, vi } from "vitest";

vi.mock("./checks/index.js", () => ({
  checkNodeVersion: vi.fn(),
  checkPragmaVersion: vi.fn(),
  checkConfigFile: vi.fn(),
  checkKeStore: vi.fn(),
  checkShellCompletions: vi.fn(),
  checkTerrazzo: vi.fn(),
  checkMcpConfigured: vi.fn(),
  checkSkillsSymlinked: vi.fn(),
}));

import {
  checkConfigFile,
  checkKeStore,
  checkMcpConfigured,
  checkNodeVersion,
  checkPragmaVersion,
  checkShellCompletions,
  checkSkillsSymlinked,
  checkTerrazzo,
} from "./checks/index.js";
import runChecks from "./runChecks.js";

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
    vi.mocked(checkKeStore).mockResolvedValue(pass("store"));
    vi.mocked(checkShellCompletions).mockResolvedValue(pass("completions"));
    vi.mocked(checkTerrazzo).mockResolvedValue(pass("terrazzo"));
    vi.mocked(checkMcpConfigured).mockResolvedValue(pass("mcp"));
    vi.mocked(checkSkillsSymlinked).mockResolvedValue(pass("skills"));

    const data = await runChecks({ cwd: "/test" });
    expect(data.passed).toBe(8);
    expect(data.failed).toBe(0);
    expect(data.skipped).toBe(0);
    expect(data.checks).toHaveLength(8);
  });

  it("counts failures and skips correctly", async () => {
    vi.mocked(checkNodeVersion).mockResolvedValue(pass("Node"));
    vi.mocked(checkPragmaVersion).mockResolvedValue(pass("pragma"));
    vi.mocked(checkConfigFile).mockResolvedValue(fail("config"));
    vi.mocked(checkKeStore).mockResolvedValue(fail("store"));
    vi.mocked(checkShellCompletions).mockResolvedValue(fail("completions"));
    vi.mocked(checkTerrazzo).mockResolvedValue(skip("terrazzo"));
    vi.mocked(checkMcpConfigured).mockResolvedValue(pass("mcp"));
    vi.mocked(checkSkillsSymlinked).mockResolvedValue(skip("skills"));

    const data = await runChecks({ cwd: "/test" });
    expect(data.passed).toBe(3);
    expect(data.failed).toBe(3);
    expect(data.skipped).toBe(2);
  });

  it("preserves check order", async () => {
    vi.mocked(checkNodeVersion).mockResolvedValue(pass("Node"));
    vi.mocked(checkPragmaVersion).mockResolvedValue(pass("pragma"));
    vi.mocked(checkConfigFile).mockResolvedValue(pass("config"));
    vi.mocked(checkKeStore).mockResolvedValue(pass("store"));
    vi.mocked(checkShellCompletions).mockResolvedValue(pass("completions"));
    vi.mocked(checkTerrazzo).mockResolvedValue(pass("terrazzo"));
    vi.mocked(checkMcpConfigured).mockResolvedValue(pass("mcp"));
    vi.mocked(checkSkillsSymlinked).mockResolvedValue(pass("skills"));

    const data = await runChecks({ cwd: "/test" });
    expect(data.checks[0].name).toBe("Node");
    expect(data.checks[1].name).toBe("pragma");
    expect(data.checks[2].name).toBe("config");
    expect(data.checks[3].name).toBe("store");
    expect(data.checks[7].name).toBe("skills");
  });
});
