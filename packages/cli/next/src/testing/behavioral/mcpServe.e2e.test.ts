/**
 * A7 — `pragma2 mcp` serve boot, observed through the real compiled binary.
 *
 * Replaces the old mocked-SIGINT unit test: `runCli` spawns with no `input`,
 * which gives the child an immediately-EOF stdin (verified equivalent to
 * `< /dev/null`) — the shape a host that closes the pipe on shutdown produces.
 * The server must connect and exit cleanly, not hang or crash.
 */

import { describe, expect, it } from "vitest";
import { runCli } from "../helpers/runCli.js";

describe("mcp serve — stdin close boots and exits cleanly (A7, e2e)", () => {
  it("exits 0 with no output and no signal", () => {
    const result = runCli(["mcp"]);
    expect(result.exitCode).toBe(0);
    expect(result.signal).toBeNull();
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe("");
  });
});
