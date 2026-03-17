import {
  collectEffects,
  dryRun,
  dryRunWith,
  type Effect,
  filterEffects,
} from "@canonical/task";
import { describe, expect, it } from "vitest";
import { readMcpConfig, removeMcpConfig, writeMcpConfig } from "./config.js";
import harnesses from "./harnesses.js";

const claude = harnesses[0];

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

  it("dry run collects effects without executing", () => {
    const result = dryRun(removeMcpConfig(claude, "/project", "pragma"));
    expect(result.effects.length).toBeGreaterThan(0);
  });
});

describe("TOML format guard", () => {
  const codex = harnesses.find(
    (h) => h.id === "codex",
  ) as (typeof harnesses)[number];

  it("readMcpConfig throws for TOML-based harnesses", () => {
    expect(() => readMcpConfig(codex, "/project")).toThrow(
      /TOML-based harness/,
    );
  });

  it("writeMcpConfig throws for TOML-based harnesses", () => {
    expect(() =>
      writeMcpConfig(codex, "/project", "pragma", { command: "pragma" }),
    ).toThrow(/TOML-based harness/);
  });

  it("removeMcpConfig throws for TOML-based harnesses", () => {
    expect(() => removeMcpConfig(codex, "/project", "pragma")).toThrow(
      /TOML-based harness/,
    );
  });
});
