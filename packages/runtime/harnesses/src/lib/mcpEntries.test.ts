import { describe, expect, it } from "vitest";
import {
  copilotMcpEntry,
  cursorMcpEntry,
  defaultMcpEntry,
  mcpEntryMatches,
  opencodeMcpEntry,
  opendesignMcpEntry,
} from "./mcpEntries.js";
import type { McpServerConfig } from "./types.js";

describe("defaultMcpEntry", () => {
  it("emits the canonical shape with every optional field present", () => {
    expect(
      defaultMcpEntry({
        command: "pragma",
        args: ["mcp"],
        cwd: "/project",
        env: { KEY: "value" },
      }),
    ).toEqual({
      command: "pragma",
      args: ["mcp"],
      cwd: "/project",
      env: { KEY: "value" },
    });
  });

  it("omits absent optional fields instead of writing undefined", () => {
    expect(defaultMcpEntry({ command: "pragma" })).toEqual({
      command: "pragma",
    });
  });
});

describe("opencodeMcpEntry", () => {
  it("emits type local with command+args combined into ONE string array (S1-3)", () => {
    expect(
      opencodeMcpEntry({ command: "pragma", args: ["mcp"], cwd: "/project" }),
    ).toEqual({
      type: "local",
      command: ["pragma", "mcp"],
      cwd: "/project",
    });
  });

  it("spells the env map `environment` and tolerates absent args/cwd", () => {
    expect(
      opencodeMcpEntry({ command: "pragma", env: { KEY: "value" } }),
    ).toEqual({
      type: "local",
      command: ["pragma"],
      environment: { KEY: "value" },
    });
  });

  it("never emits the schema-rejected `args`/`env` keys", () => {
    const entry = opencodeMcpEntry({
      command: "pragma",
      args: ["mcp"],
      env: { KEY: "value" },
    });
    expect(entry).not.toHaveProperty("args");
    expect(entry).not.toHaveProperty("env");
  });
});

describe("cursorMcpEntry", () => {
  it("adds the documented stdio discriminator over the default shape", () => {
    expect(cursorMcpEntry({ command: "pragma", args: ["mcp"] })).toEqual({
      type: "stdio",
      command: "pragma",
      args: ["mcp"],
    });
  });
});

describe("copilotMcpEntry", () => {
  it("adds type local + the documented full-tool grant", () => {
    expect(copilotMcpEntry({ command: "pragma", args: ["mcp"] })).toEqual({
      type: "local",
      command: "pragma",
      args: ["mcp"],
      tools: ["*"],
    });
  });
});

describe("opendesignMcpEntry", () => {
  it("forces env to a (possibly empty) map — the old normalizeEnv column (7g)", () => {
    expect(opendesignMcpEntry({ command: "pragma" })).toEqual({
      command: "pragma",
      env: {},
    });
  });

  it("keeps an authored env map", () => {
    expect(
      opendesignMcpEntry({ command: "pragma", env: { KEY: "value" } }),
    ).toEqual({ command: "pragma", env: { KEY: "value" } });
  });
});

describe("mcpEntryMatches", () => {
  const want: McpServerConfig = {
    command: "pragma",
    args: ["mcp"],
    cwd: "/project",
  };

  it("matches an identical entry", () => {
    expect(
      mcpEntryMatches(
        { command: "pragma", args: ["mcp"], cwd: "/project" },
        want,
        defaultMcpEntry,
      ),
    ).toBe(true);
  });

  it("ignores UNCONTROLLED extra keys (no churn on decorated files)", () => {
    expect(
      mcpEntryMatches(
        { command: "pragma", args: ["mcp"], cwd: "/project", timeout: 5000 },
        want,
        defaultMcpEntry,
      ),
    ).toBe(true);
  });

  it("rejects a drifted scalar field", () => {
    expect(
      mcpEntryMatches(
        { command: "pragma", args: ["mcp"], cwd: "/elsewhere" },
        want,
        defaultMcpEntry,
      ),
    ).toBe(false);
  });

  it("rejects a drifted array (length and element-wise)", () => {
    expect(
      mcpEntryMatches(
        { command: "pragma", args: [], cwd: "/project" },
        want,
        defaultMcpEntry,
      ),
    ).toBe(false);
    expect(
      mcpEntryMatches(
        { command: "pragma", args: ["serve"], cwd: "/project" },
        want,
        defaultMcpEntry,
      ),
    ).toBe(false);
  });

  it("rejects a missing field and non-object entries", () => {
    expect(mcpEntryMatches({ command: "pragma" }, want, defaultMcpEntry)).toBe(
      false,
    );
    expect(mcpEntryMatches("pragma", want, defaultMcpEntry)).toBe(false);
    expect(mcpEntryMatches(null, want, defaultMcpEntry)).toBe(false);
  });

  it("a CONTROLLED field the want omits must be ABSENT (global-band cwd)", () => {
    // A global-band registration omits `cwd` — a per-user server must not be
    // pinned to the directory setup happened to run from. A stale entry still
    // carrying one is drift to converge, not decoration to ignore.
    const globalWant: McpServerConfig = { command: "pragma", args: ["mcp"] };
    expect(
      mcpEntryMatches(
        { command: "pragma", args: ["mcp"], cwd: "/home/u/Downloads" },
        globalWant,
        defaultMcpEntry,
      ),
    ).toBe(false);
    expect(
      mcpEntryMatches(
        { command: "pragma", args: ["mcp"] },
        globalWant,
        defaultMcpEntry,
      ),
    ).toBe(true);
  });

  it("matches the opencode shape it would write, per its own serializer", () => {
    expect(
      mcpEntryMatches(
        { type: "local", command: ["pragma", "mcp"], cwd: "/project" },
        want,
        opencodeMcpEntry,
      ),
    ).toBe(true);
    // The legacy default-shaped entry (S1-3's corrupt output) reads as drift.
    expect(
      mcpEntryMatches(
        { command: "pragma", args: ["mcp"], cwd: "/project" },
        want,
        opencodeMcpEntry,
      ),
    ).toBe(false);
  });

  it("compares nested env maps structurally (exact keys, both ways)", () => {
    const withEnv: McpServerConfig = {
      command: "pragma",
      env: { A: "1", B: "2" },
    };
    expect(
      mcpEntryMatches(
        { command: "pragma", env: { B: "2", A: "1" } },
        withEnv,
        defaultMcpEntry,
      ),
    ).toBe(true);
    expect(
      mcpEntryMatches(
        { command: "pragma", env: { A: "1" } },
        withEnv,
        defaultMcpEntry,
      ),
    ).toBe(false);
    expect(
      mcpEntryMatches(
        { command: "pragma", env: { A: "1", B: "2", C: "3" } },
        withEnv,
        defaultMcpEntry,
      ),
    ).toBe(false);
    expect(
      mcpEntryMatches(
        { command: "pragma", env: ["A"] },
        withEnv,
        defaultMcpEntry,
      ),
    ).toBe(false);
  });
});
