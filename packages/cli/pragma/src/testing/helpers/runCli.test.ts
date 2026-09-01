/**
 * Pins how `runCli` reports a child that does not finish.
 *
 * `spawnSync` reports a timeout the same way it reports a failure to spawn —
 * through `error` — and a caller that does not look will see only
 * `status: null`, which reads downstream as an ordinary non-zero exit or, worse,
 * as a content mismatch. These tests hold the boundary where that distinction
 * is made, because the cost of losing it is paid in diagnosis rather than in a
 * red test.
 */

import { describe, expect, it } from "vitest";
import { runCli } from "./runCli.js";

describe("runCli — a child that does not finish", () => {
  it("reports a timeout as a timeout, with the duration", async () => {
    // `--help` on a 1ms budget cannot complete; any real CLI start-up exceeds it.
    await expect(async () =>
      runCli(["--help"], { timeoutMs: 1 }),
    ).rejects.toThrow(/timed out after 1ms/);
  });

  it("names the signal that killed it, so a hang is distinguishable", async () => {
    await expect(async () =>
      runCli(["--help"], { timeoutMs: 1 }),
    ).rejects.toThrow(/killed by SIG/);
  });

  it("does not describe a timeout as a failure to spawn", async () => {
    // The previous message said "failed to spawn", which sent a reader looking
    // for a missing binary or a bad path instead of a slow or hung command.
    await expect(async () =>
      runCli(["--help"], { timeoutMs: 1 }),
    ).rejects.not.toThrow(/failed to spawn/);
  });

  it("attaches whatever the child managed to write", async () => {
    // Empty streams are still reported explicitly: "(empty)" is evidence, an
    // absent section is an omission the reader has to interpret.
    await expect(async () =>
      runCli(["--help"], { timeoutMs: 1 }),
    ).rejects.toThrow(/stdout:[\s\S]*stderr:/);
  });
});
