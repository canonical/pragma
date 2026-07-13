import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("#config", async (importOriginal) => ({
  ...(await importOriginal<typeof import("#config")>()),
  configExists: vi.fn(),
}));
vi.mock("../../shared/bootStore.js", () => ({
  bootStore: vi.fn(),
}));
vi.mock("../../info/operations/collectStoreSummary.js", () => ({
  collectStoreSummary: vi.fn(),
}));
vi.mock("@canonical/harnesses", () => ({
  detectHarnesses: vi.fn(),
  readMcpConfig: vi.fn(),
}));
vi.mock("@canonical/task/node", () => ({
  runTask: vi.fn((task: unknown) => task),
}));

import { detectHarnesses, readMcpConfig } from "@canonical/harnesses";
import { configExists } from "#config";
import { collectStoreSummary } from "../../info/operations/index.js";
import { bootStore } from "../../shared/bootStore.js";
import {
  checkConfigFile,
  checkKeStore,
  checkMcpCommands,
  checkMcpConfigured,
  checkNodeVersion,
  checkPragmaVersion,
  checkShellCompletions,
  checkSkillsSymlinked,
} from "./checks/index.js";

const ctx = { cwd: "/test/project" };

beforeEach(() => {
  vi.clearAllMocks();
});

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
    vi.mocked(bootStore).mockResolvedValue({
      store: mockStore,
      packages: [],
    } as never);
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

describe("checkMcpCommands", () => {
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
  const detected = {
    harness,
    confidence: "high" as const,
    configExists: true,
    configPath: "/test/.mcp.json",
  };

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("skips when no harnesses detected", async () => {
    vi.mocked(detectHarnesses).mockReturnValue(Promise.resolve([]) as never);
    const result = await checkMcpCommands(ctx);
    expect(result.status).toBe("skip");
  });

  it("skips when only URL-based servers are configured", async () => {
    vi.mocked(detectHarnesses).mockReturnValue(
      Promise.resolve([detected]) as never,
    );
    vi.mocked(readMcpConfig).mockReturnValue(
      Promise.resolve({
        figma: { type: "http", url: "https://mcp.figma.com/mcp" },
      }) as never,
    );

    const result = await checkMcpCommands(ctx);
    expect(result.status).toBe("skip");
    expect(result.detail).toContain("no command-based");
  });

  it("passes when every configured command resolves on PATH", async () => {
    const binDir = mkdtempSync(join(tmpdir(), "pragma-doctor-"));
    writeFileSync(join(binDir, "pragma"), "#!/bin/sh\n", { mode: 0o755 });
    vi.stubEnv("PATH", binDir);

    vi.mocked(detectHarnesses).mockReturnValue(
      Promise.resolve([detected]) as never,
    );
    vi.mocked(readMcpConfig).mockReturnValue(
      Promise.resolve({
        pragma: { command: "pragma", args: ["mcp"] },
      }) as never,
    );

    const result = await checkMcpCommands(ctx);
    expect(result.status).toBe("pass");
    expect(result.detail).toContain("1 command");
  });

  it("fails and names the entry whose command does not resolve", async () => {
    const emptyDir = mkdtempSync(join(tmpdir(), "pragma-doctor-empty-"));
    vi.stubEnv("PATH", emptyDir);

    vi.mocked(detectHarnesses).mockReturnValue(
      Promise.resolve([detected]) as never,
    );
    vi.mocked(readMcpConfig).mockReturnValue(
      Promise.resolve({
        sem: { command: "sem", args: ["mcp"] },
      }) as never,
    );

    const result = await checkMcpCommands(ctx);
    expect(result.status).toBe("fail");
    expect(result.detail).toContain('"sem"');
    expect(result.detail).toContain("/test/.mcp.json");
    expect(result.remedy).toBeDefined();
  });

  it("flags only the broken entry among several", async () => {
    const binDir = mkdtempSync(join(tmpdir(), "pragma-doctor-mixed-"));
    writeFileSync(join(binDir, "pragma"), "#!/bin/sh\n", { mode: 0o755 });
    vi.stubEnv("PATH", binDir);

    vi.mocked(detectHarnesses).mockReturnValue(
      Promise.resolve([detected]) as never,
    );
    vi.mocked(readMcpConfig).mockReturnValue(
      Promise.resolve({
        pragma: { command: "pragma", args: ["mcp"] },
        sem: { command: "sem", args: ["mcp"] },
        figma: { type: "http", url: "https://mcp.figma.com/mcp" },
      }) as never,
    );

    const result = await checkMcpCommands(ctx);
    expect(result.status).toBe("fail");
    expect(result.detail).toContain('"sem"');
    expect(result.detail).not.toContain('"pragma"');
  });
});

describe("checkSkillsSymlinked", () => {
  it("skips when no harnesses detected", async () => {
    vi.mocked(detectHarnesses).mockReturnValue(Promise.resolve([]) as never);
    const result = await checkSkillsSymlinked(ctx);
    expect(result.status).toBe("skip");
  });
});
