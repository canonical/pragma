/**
 * A1 — first-run onboarding, observed through the real compiled binary.
 *
 * Unit mechanics (`ensureFirstRun`/`firstRunTask`) are PR1-protected
 * (`kernel/config/firstRun.test.ts`); this is the e2e pin: a fresh XDG config
 * home produces the greeting on STDERR (never stdout — command output must stay
 * uncorrupted), seeds `config.json`, and a second run is silent.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { freshXdgEnv, runCli } from "../helpers/runCli.js";

describe("first-run onboarding (A1, e2e)", () => {
  it("greets on stderr, seeds config.json, and stays silent on the second run", () => {
    const env = freshXdgEnv();
    const configPath = join(env.XDG_CONFIG_HOME, "pragma", "config.json");

    const first = runCli(["info"], {
      env: { ...env, PRAGMA_NO_AUTO_LLM: "1" },
    });
    expect(first.exitCode).toBe(0);
    expect(first.stderr).toContain("Hello!");
    expect(first.stderr).toContain("pre-release");
    expect(first.stderr).toContain(configPath);
    // Command output stays on stdout, untouched by the greeting.
    expect(first.stdout).not.toContain("Hello!");
    expect(first.stdout).toContain("pragma v");

    expect(existsSync(configPath)).toBe(true);
    expect(readFileSync(configPath, "utf-8")).toBe("{}\n");

    const second = runCli(["info"], {
      env: { ...env, PRAGMA_NO_AUTO_LLM: "1" },
    });
    expect(second.exitCode).toBe(0);
    expect(second.stderr).toBe("");
  });
});
