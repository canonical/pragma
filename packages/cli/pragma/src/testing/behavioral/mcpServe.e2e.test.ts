/**
 * A7 — `pragma mcp serve` boot, observed through the real shipped entry.
 *
 * Replaces the old mocked-SIGINT unit test: `runCli` spawns with no `input`,
 * which gives the child an immediately-EOF stdin (verified equivalent to
 * `< /dev/null`) — the shape a host that closes the pipe on shutdown produces.
 * The server must connect and exit cleanly, not hang or crash.
 *
 * The other half of the contract is the one the bin's narrow short-circuit
 * exists to keep honest: only the exact serve invocation serves. `pragma mcp`,
 * any help form, and any argv with a token after `serve` print text or an
 * error and start NO server — which is only observable across the process
 * boundary, because in-process dispatch never reaches the short-circuit at
 * all.
 */

import { describe, expect, it } from "vitest";
import { runCli } from "../helpers/runCli.js";

describe("mcp serve — stdin close boots and exits cleanly (A7, e2e)", () => {
  it("exits 0 with no output and no signal", () => {
    const result = runCli(["mcp", "serve"]);
    expect(result.exitCode).toBe(0);
    expect(result.signal).toBeNull();
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe("");
  });
});

describe("mcp — the noun is ordinary grammar (e2e)", () => {
  it("bare `mcp` prints the noun help and exits 0, serving nothing", () => {
    const result = runCli(["mcp"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Usage: pragma mcp");
    expect(result.stdout).toContain("serve");
    // A JSON-RPC handshake would have started with `{`; help never does.
    expect(result.stdout.startsWith("{")).toBe(false);
  });

  it("`mcp --help` prints help rather than starting the server", () => {
    const result = runCli(["mcp", "--help"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("serve");
  });

  it("`mcp serve --help` documents the verb rather than starting it", () => {
    const result = runCli(["mcp", "serve", "--help"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Start the MCP server over stdio");
    expect(result.stdout).toContain("Usage: pragma mcp serve");
  });
});

/**
 * The short-circuit matches argv EXACTLY. A prefix match would extend the
 * stdio-purity budget — no flag parsing, no first-run, nothing on stdout but
 * JSON-RPC — to argv the server was never asked to answer, so a suffixed line
 * would serve instead of being parsed. These are the two suffixes that prove
 * the fall-through: a global flag the program owns, and a stray operand.
 */
describe("mcp serve — anything suffixed falls through to the grammar (e2e)", () => {
  it("`mcp serve --version` answers the global flag, serving nothing", () => {
    const result = runCli(["mcp", "serve", "--version"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toMatch(/^\d+\.\d+\.\d+/);
    // A JSON-RPC handshake would have started with `{`; a version never does.
    expect(result.stdout.startsWith("{")).toBe(false);
  });

  it("`mcp serve extra` is parsed, so its bad global value is rejected", () => {
    const result = runCli(["mcp", "serve", "extra", "--format", "bogus"]);
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('Invalid format "bogus"');
    expect(result.stdout).toBe("");
  });
});
