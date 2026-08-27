import { describe, expect, it } from "vitest";
import harnesses from "./harnesses.js";
import { opendesignMcpEntry } from "./mcpEntries.js";

describe("harnesses registry", () => {
  it("contains all known harnesses", () => {
    expect(harnesses).toHaveLength(12);
    const ids = harnesses.map((h) => h.id);
    expect(ids).toEqual([
      "claude-code",
      "cursor",
      "windsurf",
      "cline",
      "roo-code",
      "opencode",
      "gemini-cli",
      "codex",
      "copilot",
      "antigravity",
      "vscode",
      "opendesign",
    ]);
  });

  it("every harness has required fields", () => {
    for (const h of harnesses) {
      expect(h.id).toBeTruthy();
      expect(h.name).toBeTruthy();
      expect(h.version).toBeTruthy();
      expect(h.detect.length).toBeGreaterThan(0);
      expect(typeof h.configPath).toBe("function");
      expect(h.configFormat).toMatch(/^(json|jsonc|toml)$/);
      expect(h.mcpKey).toBeTruthy();
      expect(typeof h.skillsPath).toBe("function");
    }
  });

  it("declares a valid scope, and global/both harnesses have a home config", () => {
    for (const h of harnesses) {
      expect(h.scope).toMatch(/^(project|global|both)$/);
      if (h.scope === "global" || h.scope === "both") {
        expect(typeof h.homeConfigPath).toBe("function");
      }
    }
  });

  it("windsurf is global, claude-code is both", () => {
    const windsurf = harnesses.find((h) => h.id === "windsurf");
    const claude = harnesses.find((h) => h.id === "claude-code");
    expect(windsurf?.scope).toBe("global");
    expect(claude?.scope).toBe("both");
  });

  const PLATFORM = {
    platform: "linux" as const,
    env: {},
    home: "/home/tester",
    isWsl: false,
  };

  it("cursor and gemini-cli are dual-scope with their documented home configs", () => {
    const cursor = harnesses.find((h) => h.id === "cursor");
    const gemini = harnesses.find((h) => h.id === "gemini-cli");
    expect(cursor?.scope).toBe("both");
    expect(cursor?.homeConfigPath?.(PLATFORM)).toBe(
      "/home/tester/.cursor/mcp.json",
    );
    expect(gemini?.scope).toBe("both");
    expect(gemini?.homeConfigPath?.(PLATFORM)).toBe(
      "/home/tester/.gemini/settings.json",
    );
  });

  it("codex resolves its home config under $CODEX_HOME, defaulting to ~/.codex", () => {
    const codex = harnesses.find((h) => h.id === "codex");
    expect(codex?.scope).toBe("both");
    expect(codex?.homeConfigPath?.(PLATFORM)).toBe(
      "/home/tester/.codex/config.toml",
    );
    expect(
      codex?.homeConfigPath?.({ ...PLATFORM, env: { CODEX_HOME: "/custom" } }),
    ).toBe("/custom/config.toml");
  });

  it("copilot is global-only at ~/.copilot/mcp-config.json (COPILOT_HOME honoured)", () => {
    const copilot = harnesses.find((h) => h.id === "copilot");
    expect(copilot?.scope).toBe("global");
    expect(copilot?.homeConfigPath?.(PLATFORM)).toBe(
      "/home/tester/.copilot/mcp-config.json",
    );
    expect(
      copilot?.homeConfigPath?.({
        ...PLATFORM,
        env: { COPILOT_HOME: "/custom" },
      }),
    ).toBe("/custom/mcp-config.json");
    expect(copilot?.mcpEntry).toBeDefined();
  });

  it("antigravity is dual-scope: workspace .agents/mcp_config.json, global under ~/.gemini/config", () => {
    const antigravity = harnesses.find((h) => h.id === "antigravity");
    expect(antigravity?.scope).toBe("both");
    expect(antigravity?.configPath("/project")).toBe(
      "/project/.agents/mcp_config.json",
    );
    expect(antigravity?.homeConfigPath?.(PLATFORM)).toBe(
      "/home/tester/.gemini/config/mcp_config.json",
    );
    expect(antigravity?.mcpKey).toBe("mcpServers");
  });

  it("cline shares .vscode/mcp.json with VS Code under a different mcpKey", () => {
    const cline = harnesses.find((h) => h.id === "cline");
    const vscode = harnesses.find((h) => h.id === "vscode");
    expect(cline?.configPath("/project")).toBe("/project/.vscode/mcp.json");
    expect(vscode?.configPath("/project")).toBe("/project/.vscode/mcp.json");
    expect(cline?.mcpKey).toBe("mcpServers");
    expect(vscode?.mcpKey).toBe("servers");
  });

  it("opendesign is dual-scope with project + home config and skills paths (7g)", () => {
    const od = harnesses.find((h) => h.id === "opendesign");
    expect(od?.scope).toBe("both");
    expect(od?.mcpEntry).toBe(opendesignMcpEntry);
    expect(od?.configPath("/project")).toBe("/project/.od/mcp-config.json");
    expect(
      od?.homeConfigPath?.({
        platform: "linux",
        env: {},
        home: "/home/tester",
        isWsl: false,
      }),
    ).toBe("/home/tester/.od/mcp-config.json");
    expect(od?.skillsPath("/project")).toBe("/project/.od/skills");
  });

  it("configPath returns project-relative path", () => {
    const claude = harnesses[0];
    expect(claude.configPath("/my/project")).toBe("/my/project/.mcp.json");
  });

  it("skillsPath returns project-relative path", () => {
    const claude = harnesses[0];
    expect(claude.skillsPath("/my/project")).toBe("/my/project/.claude/skills");
  });

  it("codex uses toml config format", () => {
    const codex = harnesses.find((h) => h.id === "codex");
    expect(codex?.configFormat).toBe("toml");
  });

  it("vscode uses 'servers' mcpKey", () => {
    const vscode = harnesses.find((h) => h.id === "vscode");
    expect(vscode?.mcpKey).toBe("servers");
  });

  it("opencode uses 'mcp' mcpKey", () => {
    const opencode = harnesses.find((h) => h.id === "opencode");
    expect(opencode?.mcpKey).toBe("mcp");
  });

  it("roo-code config is at .roo/mcp.json", () => {
    const roo = harnesses.find((h) => h.id === "roo-code");
    expect(roo?.configPath("/project")).toBe("/project/.roo/mcp.json");
  });

  it("all harnesses have a version range", () => {
    for (const h of harnesses) {
      expect(h.version).toBe("*");
    }
  });

  it("every harness configPath and skillsPath return strings", () => {
    const root = "/test/project";
    for (const h of harnesses) {
      expect(typeof h.configPath(root)).toBe("string");
      expect(typeof h.skillsPath(root)).toBe("string");
    }
  });

  it("windsurf configPath uses HOME env", () => {
    const windsurf = harnesses.find((h) => h.id === "windsurf");
    const path = windsurf?.configPath("/project");
    expect(path).toContain("mcp_config.json");
  });

  it("cursor configPath is at .cursor/mcp.json", () => {
    const cursor = harnesses.find((h) => h.id === "cursor");
    expect(cursor?.configPath("/project")).toBe("/project/.cursor/mcp.json");
    expect(cursor?.skillsPath("/project")).toBe("/project/.cursor/skills");
  });

  it("gemini-cli configPath is at .gemini/settings.json", () => {
    const gemini = harnesses.find((h) => h.id === "gemini-cli");
    expect(gemini?.configPath("/project")).toBe(
      "/project/.gemini/settings.json",
    );
    expect(gemini?.skillsPath("/project")).toBe("/project/.agents/skills");
  });

  it("codex configPath is at .codex/config.toml", () => {
    const codex = harnesses.find((h) => h.id === "codex");
    expect(codex?.configPath("/project")).toBe("/project/.codex/config.toml");
    expect(codex?.skillsPath("/project")).toBe("/project/.agents/skills");
  });

  it("vscode configPath is at .vscode/mcp.json", () => {
    const vscode = harnesses.find((h) => h.id === "vscode");
    expect(vscode?.configPath("/project")).toBe("/project/.vscode/mcp.json");
    expect(vscode?.skillsPath("/project")).toBe("/project/.agents/skills");
  });

  it("opencode configPath and skillsPath", () => {
    const oc = harnesses.find((h) => h.id === "opencode");
    expect(oc?.configPath("/project")).toBe("/project/opencode.json");
    expect(oc?.skillsPath("/project")).toBe("/project/.agents/skills");
  });

  it("roo-code skillsPath", () => {
    const roo = harnesses.find((h) => h.id === "roo-code");
    expect(roo?.skillsPath("/project")).toBe("/project/.roo/skills");
  });

  it("windsurf skillsPath", () => {
    const windsurf = harnesses.find((h) => h.id === "windsurf");
    expect(windsurf?.skillsPath("/project")).toBe("/project/.windsurf/skills");
  });
});
