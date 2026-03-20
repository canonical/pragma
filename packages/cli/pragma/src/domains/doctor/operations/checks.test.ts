import { describe, expect, it, vi } from "vitest";

vi.mock("../../../configExists.js", () => ({
  default: vi.fn(),
}));
vi.mock("../../shared/bootStore.js", () => ({
  bootStore: vi.fn(),
}));
vi.mock("../../info/collectStoreSummary.js", () => ({
  collectStoreSummary: vi.fn(),
}));
vi.mock("@canonical/harnesses", () => ({
  detectHarnesses: vi.fn(),
  readMcpConfig: vi.fn(),
}));
vi.mock("@canonical/task", () => ({
  runTask: vi.fn((task: unknown) => task),
}));

import { detectHarnesses, readMcpConfig } from "@canonical/harnesses";
import configExists from "../../../configExists.js";
import { collectStoreSummary } from "../../info/collectStoreSummary.js";
import { bootStore } from "../../shared/bootStore.js";
import {
  checkConfigFile,
  checkKeStore,
  checkMcpConfigured,
  checkNodeVersion,
  checkPragmaVersion,
  checkShellCompletions,
  checkSkillsSymlinked,
  checkTerrazzo,
} from "./checks.js";

const ctx = { cwd: "/test/project" };

describe("checkNodeVersion", () => {
  it("passes for current Node version", async () => {
    const result = await checkNodeVersion();
    expect(result.status).toBe("pass");
    expect(result.detail).toContain(process.versions.node);
  });
});

describe("checkPragmaVersion", () => {
  it("always passes and includes version", async () => {
    const result = await checkPragmaVersion();
    expect(result.status).toBe("pass");
    expect(result.detail).toContain("v");
  });
});

describe("checkConfigFile", () => {
  it("passes when config exists", async () => {
    vi.mocked(configExists).mockReturnValue(true);
    const result = await checkConfigFile(ctx);
    expect(result.status).toBe("pass");
  });

  it("fails with remedy when config missing", async () => {
    vi.mocked(configExists).mockReturnValue(false);
    const result = await checkConfigFile(ctx);
    expect(result.status).toBe("fail");
    expect(result.remedy).toBeDefined();
  });
});

describe("checkKeStore", () => {
  it("passes when store boots and reports triple count", async () => {
    const mockStore = {
      query: vi.fn(),
      dispose: vi.fn(),
    };
    vi.mocked(bootStore).mockResolvedValue(mockStore as never);
    vi.mocked(collectStoreSummary).mockResolvedValue({
      tripleCount: 12847,
      graphNames: [],
    });

    const result = await checkKeStore(ctx);
    expect(result.status).toBe("pass");
    expect(result.detail).toContain("12,847");
    expect(mockStore.dispose).toHaveBeenCalled();
  });

  it("fails when store boot throws", async () => {
    vi.mocked(bootStore).mockRejectedValue(new Error("no data"));
    const result = await checkKeStore(ctx);
    expect(result.status).toBe("fail");
    expect(result.remedy).toBeDefined();
  });
});

describe("checkShellCompletions", () => {
  it("returns pass or fail without throwing", async () => {
    const result = await checkShellCompletions();
    expect(["pass", "fail"]).toContain(result.status);
  });
});

describe("checkTerrazzo", () => {
  it("skips when no tokens.config.mjs exists", async () => {
    const result = await checkTerrazzo({ cwd: "/nonexistent/path" });
    expect(result.status).toBe("skip");
  });
});

describe("checkMcpConfigured", () => {
  it("fails when no harnesses detected", async () => {
    vi.mocked(detectHarnesses).mockReturnValue(Promise.resolve([]) as never);
    const result = await checkMcpConfigured(ctx);
    expect(result.status).toBe("fail");
  });

  it("passes when pragma is configured in a harness", async () => {
    const harness = {
      id: "claude-code",
      name: "Claude Code",
      configPath: () => "/test/.mcp.json",
      skillsPath: () => "/test/.claude/skills",
      detect: [],
      version: "*",
      configFormat: "json" as const,
      mcpKey: "mcpServers",
    };
    vi.mocked(detectHarnesses).mockReturnValue(
      Promise.resolve([
        {
          harness,
          confidence: "high" as const,
          configExists: true,
          configPath: "/test/.mcp.json",
        },
      ]) as never,
    );
    vi.mocked(readMcpConfig).mockReturnValue(
      Promise.resolve({
        pragma: { command: "pragma", args: ["mcp"] },
      }) as never,
    );

    const result = await checkMcpConfigured(ctx);
    expect(result.status).toBe("pass");
    expect(result.detail).toContain("Claude Code");
  });
});

describe("checkSkillsSymlinked", () => {
  it("skips when no harnesses detected", async () => {
    vi.mocked(detectHarnesses).mockReturnValue(Promise.resolve([]) as never);
    const result = await checkSkillsSymlinked(ctx);
    expect(result.status).toBe("skip");
  });
});
