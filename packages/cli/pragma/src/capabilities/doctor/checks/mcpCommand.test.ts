/**
 * `commandOf` reads BOTH registered entry shapes.
 *
 * A harness whose schema requires `command` to be an argv array (OpenCode)
 * carries the executable in the first element; a string-valued `command` IS the
 * executable. Reading only the string form made doctor skip an entry `setup`
 * had just written correctly — and report no command-based servers on a fully
 * configured machine. The two shapes must resolve to the same executable, which
 * is what these cases pin.
 */

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { PlatformEnv } from "@canonical/harnesses";
import { afterAll, describe, expect, it } from "vitest";
import { commandOf, commandResolves } from "./mcpCommand.js";

describe("commandOf — one executable, either entry shape", () => {
  it("reads a string command", () => {
    expect(commandOf({ command: "pragma", args: ["mcp", "serve"] })).toBe(
      "pragma",
    );
  });

  it("reads the executable out of an argv array", () => {
    expect(commandOf({ command: ["pragma", "mcp", "serve"] })).toBe("pragma");
  });

  it("skips the leading empty element rather than returning it", () => {
    expect(commandOf({ command: ["", "pragma"] })).toBe("pragma");
  });

  it("has no command for an HTTP entry", () => {
    expect(commandOf({ type: "http", url: "https://example.test" })).toBe(
      undefined,
    );
  });

  it("has no command for an empty string, an empty array, or a non-entry", () => {
    expect(commandOf({ command: "" })).toBe(undefined);
    expect(commandOf({ command: [] })).toBe(undefined);
    expect(commandOf(null)).toBe(undefined);
    expect(commandOf("pragma")).toBe(undefined);
  });
});

describe("commandResolves — the host's own resolution rules", () => {
  const dirs: string[] = [];
  const tmp = (): string => {
    const dir = mkdtempSync(join(tmpdir(), "pragma-mcp-path-"));
    dirs.push(dir);
    return dir;
  };
  afterAll(() => {
    for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
  });

  const hostOf = (platform: PlatformEnv["platform"], dir: string): PlatformEnv => ({
    platform,
    env: { PATH: dir },
    home: dir,
    isWsl: false,
  });

  it("resolves a Windows shim, which a bare-name PATH join cannot see", async () => {
    // npm installs the CLI as `pragma.cmd` on Windows. Joining the bare name
    // onto each PATH directory found nothing, so a registration `setup` had
    // just written correctly was reported as a dead command. (The file is
    // spelled to match a default `PATHEXT` entry exactly, because this test
    // runs on a case-sensitive filesystem.)
    const dir = tmp();
    writeFileSync(join(dir, "pragma.CMD"), "");
    expect(await commandResolves("pragma", dir, hostOf("win32", dir))).toBe(
      true,
    );
  });

  it("resolves a bare name off PATH elsewhere, and says no when it is absent", async () => {
    const dir = tmp();
    writeFileSync(join(dir, "pragma"), "");
    expect(await commandResolves("pragma", dir, hostOf("linux", dir))).toBe(
      true,
    );
    expect(await commandResolves("absent", dir, hostOf("linux", dir))).toBe(
      false,
    );
  });

  it("checks a path-bearing command as a file, relative to the project root", async () => {
    const dir = tmp();
    writeFileSync(join(dir, "local-bin"), "");
    expect(
      await commandResolves("./local-bin", dir, hostOf("linux", dir)),
    ).toBe(true);
  });
});
