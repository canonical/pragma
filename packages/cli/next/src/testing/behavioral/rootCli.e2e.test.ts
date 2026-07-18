/**
 * A2 — `--version` at every argv position; A3 — unknown-verb suggestions and
 * global-flag-before-noun ordering. Both are `bin.ts` argv-shape behaviors,
 * observed only correctly through the real process boundary (Commander parse
 * + the bin's early-exit ladder), so both are spawn-e2e.
 */

import { describe, expect, it } from "vitest";
import { VERSION } from "../../constants.js";
import { runCli } from "../helpers/runCli.js";

describe("--version at every level (A2, e2e)", () => {
  it("prints the same semver at root, noun, and verb position", () => {
    const root = runCli(["--version"]);
    const atNoun = runCli(["config", "--version"]);
    const atVerb = runCli(["config", "show", "--version"]);

    for (const result of [root, atNoun, atVerb]) {
      expect(result.exitCode).toBe(0);
      expect(result.stdout.trim()).toBe(VERSION);
    }
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("-v is equivalent to --version", () => {
    expect(runCli(["-v"]).stdout.trim()).toBe(VERSION);
  });
});

describe("unknown verb / noun → suggestion + exit 2 (A3, e2e)", () => {
  it("an unknown noun ranks the nearest known noun", () => {
    const result = runCli(["blck"]);
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('Unknown command "blck"');
    expect(result.stderr).toContain("Did you mean?");
    expect(result.stderr).toContain("- block");
  });

  it("an unknown verb under a known noun ranks that noun's verbs", () => {
    // "sho" is a PREFIX of config's one verb, "show" — guaranteed to rank
    // (suggestNames scores a prefix match ahead of edit-distance matches).
    const result = runCli(["config", "sho"]);
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('Unknown command "sho"');
    expect(result.stderr).toContain("- show");
  });
});

describe("a global flag before the noun still works (A3, e2e)", () => {
  it("--format json ahead of the command is not mistaken for the noun", () => {
    const result = runCli(["--format", "json", "config", "show"]);
    expect(result.exitCode).toBe(0);
    const envelope = JSON.parse(result.stdout) as { ok: boolean };
    expect(envelope.ok).toBe(true);
  });

  it("matches the equivalent flag-after-command invocation", () => {
    const before = runCli(["--format", "json", "info"]);
    const after = runCli(["info", "--format", "json"]);
    expect(JSON.parse(before.stdout)).toEqual(JSON.parse(after.stdout));
  });
});
