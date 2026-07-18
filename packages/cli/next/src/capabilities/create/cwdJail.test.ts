/**
 * PROTECTED — SEC-2 cwd/jail ATOMICITY (§9).
 *
 * The injected MCP-only `cwd` arg is the SINGLE per-call write root: the SEC-2
 * jail validates the output path against it AND the interpreter resolves the
 * generator's effect paths against it. These tests prove the two are the same
 * value — a path that passes the jail lands under the jailed dir, and a path
 * that escapes the jailed dir is rejected against that SAME dir — so a write
 * directory the jail never validated can never exist (no jail bypass).
 *
 * Crucially, the server's runtime cwd (and `process.cwd()`) is a DIFFERENT dir
 * than the injected `cwd`, so a passing write proves the arg drove it, not the
 * ambient process directory.
 */

import { existsSync, mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { projectMcp } from "../../testing/helpers/projectMcp.js";
import { createModule } from "./index.js";

const freshDir = (tag: string): string =>
  mkdtempSync(join(tmpdir(), `pragma2-cwdjail-${tag}-`));

const COMPONENT_ARGS = {
  framework: "react",
  withStyles: false,
  withStories: false,
  withSsrTests: false,
} as const;

let cleanup: (() => Promise<void>) | undefined;
afterEach(async () => {
  await cleanup?.();
  cleanup = undefined;
});

describe("create cwd/jail atomicity (PROTECTED)", () => {
  it("writes under the injected cwd, NOT the server's launch dir", async () => {
    const serverDir = freshDir("server");
    const projA = freshDir("projA");
    const mcp = await projectMcp([createModule], serverDir);
    cleanup = mcp.cleanup;

    const result = await mcp.callTool("create_component", {
      ...COMPONENT_ARGS,
      componentPath: "src/Widget",
      cwd: projA,
      confirm: true,
    });

    expect(result.ok).toBe(true);
    // Files land under the injected cwd…
    expect(existsSync(join(projA, "src/Widget/Widget.tsx"))).toBe(true);
    // …and NOT under the server's launch dir.
    expect(existsSync(join(serverDir, "src"))).toBe(false);
    expect(readdirSync(serverDir)).toEqual([]);
  });

  it("rejects an escape past the per-call cwd — validated against the SAME cwd", async () => {
    const serverDir = freshDir("server");
    const projA = freshDir("projA");
    const escapeSibling = freshDir("escape");
    const mcp = await projectMcp([createModule], serverDir);
    cleanup = mcp.cleanup;

    const result = await mcp.callTool("create_component", {
      ...COMPONENT_ARGS,
      componentPath: "../escape/Bad",
      cwd: projA,
      confirm: true,
    });

    expect(result.ok).toBe(false);
    expect((result.error as { code: string }).code).toBe("INVALID_INPUT");
    // Nothing was written into the sibling the path tried to escape into.
    expect(readdirSync(escapeSibling)).toEqual([]);
  });

  it("rejects a non-directory cwd with INVALID_INPUT", async () => {
    const serverDir = freshDir("server");
    const projA = freshDir("projA");
    const mcp = await projectMcp([createModule], serverDir);
    cleanup = mcp.cleanup;

    const result = await mcp.callTool("create_component", {
      ...COMPONENT_ARGS,
      componentPath: "Widget",
      cwd: join(projA, "does-not-exist"),
      confirm: true,
    });

    expect(result.ok).toBe(false);
    expect((result.error as { code: string }).code).toBe("INVALID_INPUT");
  });

  it("rejects a relative cwd with INVALID_INPUT", async () => {
    const serverDir = freshDir("server");
    const mcp = await projectMcp([createModule], serverDir);
    cleanup = mcp.cleanup;

    const result = await mcp.callTool("create_component", {
      ...COMPONENT_ARGS,
      componentPath: "Widget",
      cwd: "relative/dir",
      confirm: true,
    });

    expect(result.ok).toBe(false);
    expect((result.error as { code: string }).code).toBe("INVALID_INPUT");
  });

  it("with no cwd arg, still writes under the server's runtime cwd", async () => {
    // Parity: the CLI never sends `cwd`; the server default is its runtime cwd.
    const serverDir = freshDir("server");
    const mcp = await projectMcp([createModule], serverDir);
    cleanup = mcp.cleanup;

    const result = await mcp.callTool("create_component", {
      ...COMPONENT_ARGS,
      componentPath: "src/Widget",
      confirm: true,
    });

    expect(result.ok).toBe(true);
    expect(existsSync(join(serverDir, "src/Widget/Widget.tsx"))).toBe(true);
  });
});
