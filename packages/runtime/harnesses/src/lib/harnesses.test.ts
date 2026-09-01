import { describe, expect, it } from "vitest";
import harnesses from "./harnesses.js";
import { crushMcpEntry, opendesignMcpEntry } from "./mcpEntries.js";

describe("harnesses registry", () => {
  it("contains all known harnesses", () => {
    expect(harnesses).toHaveLength(13);
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
      "crush",
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

  // `TargetGroup` records the sharing harnesses by NAME, not by id, so every
  // consumer that maps a group back to a registry row (doctor's inventory) is
  // relying on names being a key. Two rows sharing a name would silently merge.
  it("ids and display names are both unique", () => {
    expect(new Set(harnesses.map((h) => h.id)).size).toBe(harnesses.length);
    expect(new Set(harnesses.map((h) => h.name)).size).toBe(harnesses.length);
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

  it("opencode is dual-scope, with the global config its docs name", () => {
    // Declared project-only, opencode was the one harness the GLOBAL band —
    // the default, and the band this product focuses on — silently skipped:
    // `setup mcp` installed every other harness and left this one unconfigured.
    // https://opencode.ai/docs/config/ lists `~/.config/opencode/opencode.json`
    // in its precedence order above the project file, and merges the two.
    const oc = harnesses.find((h) => h.id === "opencode");
    expect(oc?.scope).toBe("both");
    expect(oc?.homeConfigPath?.(PLATFORM)).toBe(
      "/home/tester/.config/opencode/opencode.json",
    );
  });

  it("opencode's global config follows $XDG_CONFIG_HOME, not the home dir", () => {
    // `~/.config/<tool>` is the XDG convention, not env-paths: a user who has
    // moved their config base keeps NOTHING under `~/.config`, so resolving
    // against home writes into a file OpenCode never reads.
    const oc = harnesses.find((h) => h.id === "opencode");
    expect(
      oc?.homeConfigPath?.({ ...PLATFORM, env: { XDG_CONFIG_HOME: "/xdg" } }),
    ).toBe("/xdg/opencode/opencode.json");
  });

  it("opencode is detectable from the global config dir, not just a project file", () => {
    // A detector that only looks for `opencode.json` in the project root
    // cannot see a user who has opencode installed and configured globally —
    // which is every user before their first project config exists.
    // Declared in the `$XDG_CONFIG_HOME/` form for the same reason the config
    // path is: a `~/.config/opencode` signal is invisible to a user who has
    // moved their config base, and the harness is then skipped entirely.
    const oc = harnesses.find((h) => h.id === "opencode");
    expect(oc?.detect).toContainEqual({
      type: "directory",
      path: "$XDG_CONFIG_HOME/opencode",
    });
  });

  it("crush is dual-scope: project crush.json, global under $XDG_CONFIG_HOME/crush", () => {
    // Crush merges a global config with project files (lookupConfigs,
    // load.go @7944b8e); a project-only row would be skipped by the DEFAULT
    // global band entirely — the same hole opencode and vscode fell into.
    const crush = harnesses.find((h) => h.id === "crush");
    expect(crush?.scope).toBe("both");
    expect(crush?.configPath("/project")).toBe("/project/crush.json");
    expect(crush?.homeConfigPath?.(PLATFORM)).toBe(
      "/home/tester/.config/crush/crush.json",
    );
    expect(crush?.skillsPath("/project")).toBe("/project/.agents/skills");
  });

  it("crush's global config follows $XDG_CONFIG_HOME on every platform, and $CRUSH_GLOBAL_CONFIG wins", () => {
    // Crush's home.Config() is `$XDG_CONFIG_HOME ?? ~/.config` with NO
    // platform switch — macOS included, there is no ~/Library arm — and
    // GlobalConfig() prefers $CRUSH_GLOBAL_CONFIG as the DIRECTORY holding
    // crush.json.
    const crush = harnesses.find((h) => h.id === "crush");
    expect(
      crush?.homeConfigPath?.({
        ...PLATFORM,
        env: { XDG_CONFIG_HOME: "/xdg" },
      }),
    ).toBe("/xdg/crush/crush.json");
    expect(
      crush?.homeConfigPath?.({
        ...PLATFORM,
        platform: "darwin",
        home: "/Users/tester",
      }),
    ).toBe("/Users/tester/.config/crush/crush.json");
    expect(
      crush?.homeConfigPath?.({
        ...PLATFORM,
        env: { CRUSH_GLOBAL_CONFIG: "/custom" },
      }),
    ).toBe("/custom/crush.json");
  });

  it("crush uses the top-level `mcp` key and the type-carrying entry shape", () => {
    // The JSON key is `mcp`, not `mcpServers` (config.go `MCP MCPs
    // json:"mcp"`), and the entry MUST carry `type` — without it Crush's
    // createTransport errors "unsupported mcp type" and the server silently
    // never starts.
    const crush = harnesses.find((h) => h.id === "crush");
    expect(crush?.mcpKey).toBe("mcp");
    expect(crush?.mcpEntry).toBe(crushMcpEntry);
  });

  it("crush is detectable from the global config dir, not just a project file", () => {
    // Same reasoning as opencode: before the first project config exists,
    // the only filesystem trace of an installed Crush is its global config
    // dir — declared in $XDG_CONFIG_HOME form so a relocated config base
    // still resolves.
    const crush = harnesses.find((h) => h.id === "crush");
    expect(crush?.detect).toContainEqual({
      type: "directory",
      path: "$XDG_CONFIG_HOME/crush",
    });
  });

  it("crush never keys detection on Crush's own state files", () => {
    // `.crush/` (the data DIRECTORY) is a truthful "Crush ran here" signal
    // with a single owner, but `.crush/crush.json` and the machine-owned
    // data config are Crush's write targets — pragma neither probes nor
    // writes those files.
    const crush = harnesses.find((h) => h.id === "crush");
    const paths = (crush?.detect ?? []).flatMap((s) =>
      "path" in s ? [s.path] : [],
    );
    expect(paths).toContain(".crush");
    expect(paths).not.toContain(".crush/crush.json");
    expect(paths.some((p) => p.includes(".local/share"))).toBe(false);
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
