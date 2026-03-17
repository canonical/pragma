import { describe, expect, it } from "vitest";
import harnesses from "./harnesses.js";

describe("harnesses registry", () => {
  it("contains all known harnesses", () => {
    expect(harnesses).toHaveLength(9);
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
      "vscode",
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
});
