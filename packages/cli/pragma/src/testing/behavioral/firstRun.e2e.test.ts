/**
 * First-run onboarding, observed through the real shipped entry.
 *
 * The contract inverted: onboarding no longer WRITES. A read-only command must
 * leave the config home empty, and the un-set-up hint belongs on the read-only
 * front door — where the machine's state is discovered by looking, not by
 * seeding a file and a marker ahead of any consent.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { freshXdgEnv, runCli } from "../helpers/runCli.js";

describe("first-run onboarding (e2e)", () => {
  it("hints on the front door and seeds nothing", () => {
    const env = freshXdgEnv();
    const configPath = join(env.XDG_CONFIG_HOME, "pragma", "config.json");

    // A read-only command writes NO config and carries no banner: the greeting
    // used to interleave itself into the output of unrelated runs.
    const read = runCli(["info"], {
      env: { ...env, PRAGMA_NO_AUTO_LLM: "1" },
    });
    expect(read.exitCode).toBe(0);
    expect(read.stdout).toContain("pragma v");
    expect(read.stderr).not.toContain("pre-release");
    expect(existsSync(configPath)).toBe(false);

    // The front door is a read, so it is where the hint belongs — on stderr,
    // leaving the front door's own output uncorrupted on stdout.
    const door = runCli([], { env: { ...env, PRAGMA_NO_AUTO_LLM: "1" } });
    expect(door.exitCode).toBe(0);
    expect(door.stderr).toContain("pre-release");
    expect(door.stderr).toContain("pragma setup");
    expect(door.stdout).not.toContain("pre-release");
    // Still nothing written: the hint is a probe, not a seed.
    expect(existsSync(configPath)).toBe(false);
  });
});
