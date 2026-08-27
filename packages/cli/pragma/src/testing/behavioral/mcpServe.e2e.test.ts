/**
 * A7 — `pragma mcp serve` boot, observed through the real shipped entry.
 *
 * Replaces the old mocked-SIGINT unit test: `runCli` spawns with no `input`,
 * which gives the child an immediately-EOF stdin (verified equivalent to
 * `< /dev/null`) — the shape a host that closes the pipe on shutdown produces.
 * The server must connect and exit cleanly, not hang or crash.
 *
 * The other half of the contract is the one the bin's narrow short-circuit
 * exists to keep honest: only the exact serve invocation serves. `pragma mcp`
 * and any help form print text and start NO server — which is only observable
 * across the process boundary, because in-process dispatch never reaches the
 * short-circuit at all.
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
