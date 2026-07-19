import {
  collectEffects,
  dryRun,
  dryRunWith,
  type Effect,
  filterEffects,
} from "@canonical/task";
import { describe, expect, it } from "vitest";
import {
  defaultBandOf,
  readMcpConfig,
  removeMcpConfig,
  resolveConfigTarget,
  writeMcpConfig,
} from "./config.js";
import findHarnessById from "./findHarnessById.js";
import harnesses from "./harnesses.js";
import type { PlatformEnv } from "./platformPaths.js";

const claude = harnesses[0];

/** A fixed host so home-band paths resolve deterministically. */
const PLATFORM: PlatformEnv = {
  platform: "linux",
  env: {},
  home: "/home/tester",
  isWsl: false,
};

const cursor = findHarnessById("cursor") as (typeof harnesses)[number];
const windsurf = findHarnessById("windsurf") as (typeof harnesses)[number];

type MockSpec = Record<string, (effect: Effect) => unknown>;

const buildMocks = (spec: MockSpec): Map<string, (effect: Effect) => unknown> =>
  new Map(Object.entries(spec));

const existsMock =
  (predicate: (path: string) => boolean) =>
  (effect: Effect): unknown =>
    predicate((effect as Effect & { _tag: "Exists" }).path);

const readFileMock =
  (content: string) =>
  (_effect: Effect): unknown =>
    content;

const writeMock = (_effect: Effect): unknown => undefined;
const mkdirMock = (_effect: Effect): unknown => undefined;

describe("readMcpConfig", () => {
  it("returns empty object when config file does not exist", () => {
    const result = dryRunWith(
      readMcpConfig(claude, "/project"),
      buildMocks({ Exists: existsMock(() => false) }),
    );

    expect(result.value).toEqual({});
  });

  it("parses existing config and returns mcpServers", () => {
    const existingConfig = JSON.stringify({
      mcpServers: {
        existing: { command: "some-server", args: ["--port", "3000"] },
      },
    });

    const result = dryRunWith(
      readMcpConfig(claude, "/project"),
      buildMocks({
        Exists: existsMock(() => true),
        ReadFile: readFileMock(existingConfig),
      }),
    );

    expect(result.value).toEqual({
      existing: { command: "some-server", args: ["--port", "3000"] },
    });
  });

  it("returns empty object when config has no mcpServers key", () => {
    const result = dryRunWith(
      readMcpConfig(claude, "/project"),
      buildMocks({
        Exists: existsMock(() => true),
        ReadFile: readFileMock(JSON.stringify({ otherKey: true })),
      }),
    );

    expect(result.value).toEqual({});
  });

  it("returns empty object when config is a JSON array", () => {
    const result = dryRunWith(
      readMcpConfig(claude, "/project"),
      buildMocks({
        Exists: existsMock(() => true),
        ReadFile: readFileMock("[1, 2, 3]"),
      }),
    );

    expect(result.value).toEqual({});
  });

  it("returns empty object when config is invalid JSON", () => {
    const result = dryRunWith(
      readMcpConfig(claude, "/project"),
      buildMocks({
        Exists: existsMock(() => true),
        ReadFile: readFileMock("not json {{{"),
      }),
    );

    expect(result.value).toEqual({});
  });

  it("produces exists effect for the config path", () => {
    const effects = collectEffects(readMcpConfig(claude, "/project"));
    const existsEffects = filterEffects(effects, "Exists");
    expect(existsEffects.length).toBeGreaterThan(0);
  });
});

describe("writeMcpConfig", () => {
  it("creates new config file when none exists", () => {
    const result = dryRunWith(
      writeMcpConfig(claude, "/project", "pragma", {
        command: "pragma",
        args: ["mcp"],
      }),
      buildMocks({
        Exists: existsMock(() => false),
        MakeDir: mkdirMock,
        WriteFile: writeMock,
      }),
    );

    const writeEffects = filterEffects(result.effects, "WriteFile");
    expect(writeEffects.length).toBe(1);

    const written = JSON.parse(writeEffects[0].content);
    expect(written.mcpServers.pragma).toEqual({
      command: "pragma",
      args: ["mcp"],
    });
  });

  it("merges into existing config preserving other entries", () => {
    const existingConfig = JSON.stringify({
      mcpServers: {
        figma: { command: "figma-mcp" },
      },
      otherField: true,
    });

    const result = dryRunWith(
      writeMcpConfig(claude, "/project", "pragma", {
        command: "pragma",
        args: ["mcp"],
      }),
      buildMocks({
        Exists: existsMock(() => true),
        ReadFile: readFileMock(existingConfig),
        WriteFile: writeMock,
      }),
    );

    const writeEffects = filterEffects(result.effects, "WriteFile");
    expect(writeEffects.length).toBe(1);

    const written = JSON.parse(writeEffects[0].content);
    expect(written.mcpServers.figma).toEqual({ command: "figma-mcp" });
    expect(written.mcpServers.pragma).toEqual({
      command: "pragma",
      args: ["mcp"],
    });
    expect(written.otherField).toBe(true);
  });

  it("overwrites existing server entry with same name", () => {
    const existingConfig = JSON.stringify({
      mcpServers: {
        pragma: { command: "old-pragma" },
      },
    });

    const result = dryRunWith(
      writeMcpConfig(claude, "/project", "pragma", {
        command: "pragma",
        args: ["mcp"],
      }),
      buildMocks({
        Exists: existsMock(() => true),
        ReadFile: readFileMock(existingConfig),
        WriteFile: writeMock,
      }),
    );

    const writeEffects = filterEffects(result.effects, "WriteFile");
    const written = JSON.parse(writeEffects[0].content);
    expect(written.mcpServers.pragma).toEqual({
      command: "pragma",
      args: ["mcp"],
    });
  });

  it("writes to correct config path for the harness", () => {
    const effects = collectEffects(
      writeMcpConfig(claude, "/project", "pragma", { command: "pragma" }),
    );
    const existsEffects = filterEffects(effects, "Exists");
    expect(existsEffects.some((e) => e.path === "/project/.mcp.json")).toBe(
      true,
    );
  });

  it("creates parent directory when config file is new", () => {
    const cursor = harnesses[1];
    const result = dryRunWith(
      writeMcpConfig(cursor, "/project", "pragma", { command: "pragma" }),
      buildMocks({
        Exists: existsMock(() => false),
        MakeDir: mkdirMock,
        WriteFile: writeMock,
      }),
    );

    const mkdirEffects = filterEffects(result.effects, "MakeDir");
    expect(mkdirEffects.length).toBe(1);
  });
});

describe("removeMcpConfig", () => {
  it("is a no-op when config file does not exist", () => {
    const result = dryRunWith(
      removeMcpConfig(claude, "/project", "pragma"),
      buildMocks({ Exists: existsMock(() => false) }),
    );

    const writeEffects = filterEffects(result.effects, "WriteFile");
    expect(writeEffects.length).toBe(0);
  });

  it("removes the named server from existing config", () => {
    const existingConfig = JSON.stringify({
      mcpServers: {
        pragma: { command: "pragma", args: ["mcp"] },
        figma: { command: "figma-mcp" },
      },
    });

    const result = dryRunWith(
      removeMcpConfig(claude, "/project", "pragma"),
      buildMocks({
        Exists: existsMock(() => true),
        ReadFile: readFileMock(existingConfig),
        WriteFile: writeMock,
      }),
    );

    const writeEffects = filterEffects(result.effects, "WriteFile");
    expect(writeEffects.length).toBe(1);

    const written = JSON.parse(writeEffects[0].content);
    expect(written.mcpServers.pragma).toBeUndefined();
    expect(written.mcpServers.figma).toEqual({ command: "figma-mcp" });
  });

  it("handles removing from config with no mcpServers key", () => {
    const result = dryRunWith(
      removeMcpConfig(claude, "/project", "pragma"),
      buildMocks({
        Exists: existsMock(() => true),
        ReadFile: readFileMock(JSON.stringify({ otherField: true })),
        WriteFile: writeMock,
      }),
    );

    const writeEffects = filterEffects(result.effects, "WriteFile");
    expect(writeEffects.length).toBe(1);
    const written = JSON.parse(writeEffects[0].content);
    expect(written.mcpServers).toEqual({});
  });

  it("dry run collects effects without executing", () => {
    const result = dryRun(removeMcpConfig(claude, "/project", "pragma"));
    expect(result.effects.length).toBeGreaterThan(0);
  });
});

describe("TOML config (Codex)", () => {
  const codex = harnesses.find(
    (h) => h.id === "codex",
  ) as (typeof harnesses)[number];

  it("reads mcp_servers from TOML config", () => {
    const tomlContent = [
      "[mcp_servers.figma]",
      'url = "https://mcp.figma.com/mcp"',
      "",
      "[mcp_servers.pragma]",
      'command = "pragma"',
    ].join("\n");

    const result = dryRunWith(
      readMcpConfig(codex, "/project"),
      buildMocks({
        Exists: existsMock(() => true),
        ReadFile: readFileMock(tomlContent),
      }),
    );

    expect(result.value.pragma).toBeDefined();
    expect(result.value.pragma.command).toBe("pragma");
  });

  it("writes mcp_servers entry as TOML table", () => {
    const result = dryRunWith(
      writeMcpConfig(codex, "/project", "pragma", {
        command: "pragma",
        args: ["mcp"],
      }),
      buildMocks({
        Exists: existsMock(() => false),
        MakeDir: mkdirMock,
        WriteFile: writeMock,
      }),
    );

    const writeEffects = filterEffects(result.effects, "WriteFile");
    expect(writeEffects.length).toBe(1);
    expect(writeEffects[0].content).toContain("[mcp_servers.pragma]");
    expect(writeEffects[0].content).toContain('command = "pragma"');
  });

  it("writes TOML without optional args or cwd", () => {
    const result = dryRunWith(
      writeMcpConfig(codex, "/project", "simple", {
        command: "simple-server",
      }),
      buildMocks({
        Exists: existsMock(() => false),
        MakeDir: mkdirMock,
        WriteFile: writeMock,
      }),
    );

    const writeEffects = filterEffects(result.effects, "WriteFile");
    expect(writeEffects[0].content).toContain("[mcp_servers.simple]");
    expect(writeEffects[0].content).toContain('command = "simple-server"');
    expect(writeEffects[0].content).not.toContain("args");
    expect(writeEffects[0].content).not.toContain("cwd");
  });

  it("merges into existing TOML config", () => {
    const tomlContent = [
      "[mcp_servers.figma]",
      'url = "https://mcp.figma.com/mcp"',
      "",
    ].join("\n");

    const result = dryRunWith(
      writeMcpConfig(codex, "/project", "pragma", {
        command: "pragma",
        args: ["mcp"],
      }),
      buildMocks({
        Exists: existsMock(() => true),
        ReadFile: readFileMock(tomlContent),
        WriteFile: writeMock,
      }),
    );

    const writeEffects = filterEffects(result.effects, "WriteFile");
    expect(writeEffects.length).toBe(1);
    expect(writeEffects[0].content).toContain("[mcp_servers.pragma]");
    expect(writeEffects[0].content).toContain('command = "pragma"');
  });

  it("writes TOML with cwd option", () => {
    const result = dryRunWith(
      writeMcpConfig(codex, "/project", "pragma", {
        command: "pragma",
        args: ["mcp"],
        cwd: "/project",
      }),
      buildMocks({
        Exists: existsMock(() => false),
        MakeDir: mkdirMock,
        WriteFile: writeMock,
      }),
    );

    const writeEffects = filterEffects(result.effects, "WriteFile");
    expect(writeEffects[0].content).toContain('cwd = "/project"');
  });

  it("removes mcp_servers entry from TOML", () => {
    const tomlContent = [
      "[mcp_servers.figma]",
      'url = "https://mcp.figma.com/mcp"',
      "",
      "[mcp_servers.pragma]",
      'command = "pragma"',
    ].join("\n");

    const result = dryRunWith(
      removeMcpConfig(codex, "/project", "pragma"),
      buildMocks({
        Exists: existsMock(() => true),
        ReadFile: readFileMock(tomlContent),
        WriteFile: writeMock,
      }),
    );

    const writeEffects = filterEffects(result.effects, "WriteFile");
    expect(writeEffects.length).toBe(1);
    expect(writeEffects[0].content).toContain("[mcp_servers.figma]");
    expect(writeEffects[0].content).not.toContain("[mcp_servers.pragma]");
  });
});

describe("defaultBandOf", () => {
  it("defaults a global-only harness to the global band", () => {
    expect(defaultBandOf(windsurf)).toBe("global");
  });

  it("defaults project and both harnesses to the project band", () => {
    expect(defaultBandOf(cursor)).toBe("project");
    expect(defaultBandOf(claude)).toBe("project");
  });
});

describe("resolveConfigTarget", () => {
  it("resolves the project band to the harness project path", () => {
    const target = resolveConfigTarget(claude, "/project", "project", PLATFORM);
    expect(target.path).toBe("/project/.mcp.json");
    expect(target.mcpKey).toBe("mcpServers");
    expect(target.scope).toBe("both");
  });

  it("resolves the global band to the harness home path", () => {
    const target = resolveConfigTarget(claude, "/project", "global", PLATFORM);
    expect(target.path).toBe("/home/tester/.claude.json");
  });

  it("throws for a global band on a harness with no homeConfigPath", () => {
    expect(() =>
      resolveConfigTarget(cursor, "/project", "global", PLATFORM),
    ).toThrow(/homeConfigPath/);
  });
});

describe("scope-aware read/write (explicit band + platform)", () => {
  it("writes the pragma server into the home config for the global band", () => {
    const result = dryRunWith(
      writeMcpConfig(
        claude,
        "/project",
        "pragma",
        { command: "pragma", args: ["mcp"] },
        "global",
        PLATFORM,
      ),
      buildMocks({
        Exists: existsMock(() => false),
        MakeDir: mkdirMock,
        WriteFile: writeMock,
      }),
    );

    const writeEffects = filterEffects(result.effects, "WriteFile");
    expect(writeEffects.length).toBe(1);
    expect(writeEffects[0].path).toBe("/home/tester/.claude.json");
    const written = JSON.parse(writeEffects[0].content);
    expect(written.mcpServers.pragma).toEqual({
      command: "pragma",
      args: ["mcp"],
    });
  });

  it("reads the home config for the global band", () => {
    const result = dryRunWith(
      readMcpConfig(claude, "/project", "global", PLATFORM),
      buildMocks({
        Exists: existsMock((path) => path === "/home/tester/.claude.json"),
        ReadFile: readFileMock(
          JSON.stringify({ mcpServers: { pragma: { command: "pragma" } } }),
        ),
      }),
    );
    expect(result.value).toEqual({ pragma: { command: "pragma" } });
  });

  it("removes from the home config for the global band", () => {
    const result = dryRunWith(
      removeMcpConfig(claude, "/project", "pragma", "global", PLATFORM),
      buildMocks({
        Exists: existsMock((path) => path === "/home/tester/.claude.json"),
        ReadFile: readFileMock(
          JSON.stringify({
            mcpServers: {
              pragma: { command: "pragma" },
              keep: { command: "k" },
            },
          }),
        ),
        WriteFile: writeMock,
      }),
    );
    const writeEffects = filterEffects(result.effects, "WriteFile");
    expect(writeEffects[0].path).toBe("/home/tester/.claude.json");
    const written = JSON.parse(writeEffects[0].content);
    expect(written.mcpServers.pragma).toBeUndefined();
    expect(written.mcpServers.keep).toEqual({ command: "k" });
  });
});

// SEC-1: a JSONC config (comments, trailing commas — valid in Cursor/VS Code/
// Windsurf) must be read and merged, never silently overwritten; a config that
// is not valid JSON/JSONC must fail closed rather than be destroyed.
describe("SEC-1 — non-destructive JSONC handling", () => {
  const jsoncConfig = [
    "{",
    "  // editor-managed servers",
    '  "mcpServers": {',
    '    "figma": { "command": "figma-mcp" },',
    "  },",
    "}",
  ].join("\n");

  it("reads mcpServers from a JSONC config with comments and a trailing comma", () => {
    const result = dryRunWith(
      readMcpConfig(claude, "/project"),
      buildMocks({
        Exists: existsMock(() => true),
        ReadFile: readFileMock(jsoncConfig),
      }),
    );

    expect(result.value).toEqual({ figma: { command: "figma-mcp" } });
  });

  it("merges into a JSONC config, preserving the existing server", () => {
    const result = dryRunWith(
      writeMcpConfig(claude, "/project", "pragma", { command: "pragma" }),
      buildMocks({
        Exists: existsMock(() => true),
        ReadFile: readFileMock(jsoncConfig),
        WriteFile: writeMock,
      }),
    );

    const writeEffects = filterEffects(result.effects, "WriteFile");
    expect(writeEffects.length).toBe(1);
    const written = JSON.parse(writeEffects[0].content);
    expect(written.mcpServers.figma).toEqual({ command: "figma-mcp" });
    expect(written.mcpServers.pragma).toEqual({ command: "pragma" });
  });

  it("adds mcpServers to a valid config that lacks the key, keeping other fields", () => {
    const result = dryRunWith(
      writeMcpConfig(claude, "/project", "pragma", { command: "pragma" }),
      buildMocks({
        Exists: existsMock(() => true),
        ReadFile: readFileMock(JSON.stringify({ otherField: true })),
        WriteFile: writeMock,
      }),
    );

    const writeEffects = filterEffects(result.effects, "WriteFile");
    const written = JSON.parse(writeEffects[0].content);
    expect(written.mcpServers.pragma).toEqual({ command: "pragma" });
    expect(written.otherField).toBe(true);
  });

  it("refuses to write over an unparseable config (fails closed, no WriteFile)", () => {
    expect(() =>
      dryRunWith(
        writeMcpConfig(claude, "/project", "pragma", { command: "pragma" }),
        buildMocks({
          Exists: existsMock(() => true),
          ReadFile: readFileMock("{ this is not valid json"),
          WriteFile: writeMock,
        }),
      ),
    ).toThrow(/Refusing to modify/);
  });

  it("refuses to remove from an unparseable config", () => {
    expect(() =>
      dryRunWith(
        removeMcpConfig(claude, "/project", "pragma"),
        buildMocks({
          Exists: existsMock(() => true),
          ReadFile: readFileMock("}}} broken"),
          WriteFile: writeMock,
        }),
      ),
    ).toThrow(/Refusing to modify/);
  });

  it.each([
    ["a string", '{"mcpServers":"oops"}'],
    ["null", '{"mcpServers":null}'],
    ["an array", '{"mcpServers":[1,2]}'],
  ])("treats a %s mcpServers as empty on read", (_label, content) => {
    const result = dryRunWith(
      readMcpConfig(claude, "/project"),
      buildMocks({
        Exists: existsMock(() => true),
        ReadFile: readFileMock(content),
      }),
    );
    expect(result.value).toEqual({});
  });

  it("re-initialises a non-object mcpServers on write, keeping other fields", () => {
    const result = dryRunWith(
      writeMcpConfig(claude, "/project", "pragma", { command: "pragma" }),
      buildMocks({
        Exists: existsMock(() => true),
        ReadFile: readFileMock('{"mcpServers":"corrupt","otherField":true}'),
        WriteFile: writeMock,
      }),
    );

    const writeEffects = filterEffects(result.effects, "WriteFile");
    const written = JSON.parse(writeEffects[0].content);
    expect(written.mcpServers.pragma).toEqual({ command: "pragma" });
    expect(written.otherField).toBe(true);
  });
});
