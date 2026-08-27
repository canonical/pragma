/**
 * `checkMcpCommands` — the doctor check that probes every command-based MCP
 * entry for a resolvable executable.
 *
 * The cases here exist because `command` has TWO schema-legal shapes and the
 * check must read both: the scalar most harnesses take (`command: "pragma"`)
 * and the string ARRAY OpenCode's `McpLocalConfig` requires
 * (`command: ["pragma", "mcp"]`). A reader that understands only the scalar
 * skips the array entry silently — doctor then reports a clean "nothing to
 * check" on a machine `setup` has just configured correctly, which is the
 * failure mode these tests pin shut.
 *
 * Everything is driven off a temp project root, a temp HOME, and a temp bin
 * dir prepended to `PATH` holding a STUB executable — nothing here reads or
 * writes a real config, and no real binary is installed or spawned.
 */

import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { checkMcpCommands } from "./checkMcpCommands.js";

const STUB = "pragma-stub-mcp";

let root: string;
let bin: string;
let prevHome: string | undefined;
let prevPath: string | undefined;
const roots: string[] = [];

const tmp = (prefix: string): string => {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  roots.push(dir);
  return dir;
};

beforeEach(() => {
  prevHome = process.env.HOME;
  prevPath = process.env.PATH;
  root = tmp("pragma-mcp-commands-");
  bin = tmp("pragma-mcp-bin-");
  // An isolated HOME keeps the developer's real global harness configs out of
  // detection, so only what a case writes under `root` is examined.
  process.env.HOME = tmp("pragma-mcp-home-");
  writeFileSync(join(bin, STUB), "#!/bin/sh\nexit 0\n");
  chmodSync(join(bin, STUB), 0o755);
  process.env.PATH = `${bin}:${prevPath ?? ""}`;
});

afterEach(() => {
  process.env.HOME = prevHome;
  process.env.PATH = prevPath;
  for (const dir of roots) rmSync(dir, { recursive: true, force: true });
  roots.length = 0;
});

/** Write OpenCode's `opencode.json`, whose `mcp` entries take ARRAY commands. */
const writeOpencode = (command: unknown): void => {
  writeFileSync(
    join(root, "opencode.json"),
    JSON.stringify({ mcp: { pragma: { type: "local", command } } }),
  );
};

/** Write Claude Code's `.mcp.json`, whose entries take a SCALAR command. */
const writeClaudeCode = (command: unknown): void => {
  mkdirSync(root, { recursive: true });
  writeFileSync(
    join(root, ".mcp.json"),
    JSON.stringify({ mcpServers: { pragma: { command, args: ["mcp"] } } }),
  );
};

describe("checkMcpCommands — both command shapes", () => {
  it("resolves the executable from an array command (first element, rest are arguments)", async () => {
    writeOpencode([STUB, "mcp", "--verbose"]);
    const result = await checkMcpCommands(root);
    expect(result.status).toBe("pass");
    expect(result.detail).toBe("1 command resolve on PATH");
  });

  it("resolves the executable from a scalar command", async () => {
    writeClaudeCode(STUB);
    const result = await checkMcpCommands(root);
    expect(result.status).toBe("pass");
    expect(result.detail).toBe("1 command resolve on PATH");
  });

  it("gives the array and scalar shapes of the same entry the same verdict", async () => {
    writeOpencode([STUB, "mcp"]);
    writeClaudeCode(STUB);
    const result = await checkMcpCommands(root);
    expect(result.status).toBe("pass");
    expect(result.detail).toBe("2 commands resolve on PATH");
  });

  it("names the executable — not the whole array — when an array command is unresolvable", async () => {
    writeOpencode(["pragma-stub-absent", "mcp"]);
    const result = await checkMcpCommands(root);
    expect(result.status).toBe("fail");
    expect(result.items?.[0]?.detail).toContain(
      '"pragma-stub-absent" not found',
    );
  });

  it("skips entries with no command at all (HTTP/SSE)", async () => {
    writeFileSync(
      join(root, "opencode.json"),
      JSON.stringify({ mcp: { remote: { type: "remote", url: "https://x" } } }),
    );
    const result = await checkMcpCommands(root);
    expect(result.status).toBe("skip");
    expect(result.detail).toBe("no command-based MCP servers configured");
  });
});
