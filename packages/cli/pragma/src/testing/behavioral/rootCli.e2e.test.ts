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

  it("-v is rejected — --version is the one spelling", () => {
    const result = runCli(["-v"]);
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('Unknown option "-v"');
  });
});

describe("global value flags reject bad values loudly (e2e)", () => {
  it("--format text is not a format", () => {
    const result = runCli(["config", "show", "--format", "text"]);
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('Invalid format "text"');
    expect(result.stderr).toContain("plain, llm, json");
  });

  it("--detail rejects an unrecognized level, naming the valid ones", () => {
    const result = runCli(["config", "show", "--detail", "bogus"]);
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('Invalid detail "bogus"');
    expect(result.stderr).toContain("summary, standard, detailed");
  });

  it("--verbose=<x> is rejected — the flag takes no value", () => {
    const result = runCli(["config", "show", "--verbose=true"]);
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("`--verbose` takes no value");
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

describe("--help riding a typo still exits 2 (e2e)", () => {
  // Commander answers `--help` BEFORE it rejects an unknown operand, so an
  // unknown command with `--help` printed help and exited 0 — a typo
  // reporting success. The bin's pre-parse guard resolves the tokens first.
  it("an unknown noun with --help gets the SAME error as without it", () => {
    const bare = runCli(["changelog"]);
    const withHelp = runCli(["changelog", "--help"]);
    expect(withHelp.exitCode).toBe(2);
    expect(withHelp.stderr).toContain('Unknown command "changelog"');
    // One diagnostic, not two dialects: byte-identical to the flagless typo.
    expect(withHelp.stderr).toBe(bare.stderr);
  });

  it("an unknown verb under a known noun with --help exits 2, with suggestions", () => {
    const result = runCli(["config", "sho", "--help"]);
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('Unknown command "sho"');
    expect(result.stderr).toContain("- show");
  });

  it("an explicit machine format gets the usual error envelope", () => {
    const result = runCli(["changelog", "--help", "--format", "json"]);
    expect(result.exitCode).toBe(2);
    const envelope = JSON.parse(result.stderr) as {
      ok: boolean;
      error: { code: string };
    };
    expect(envelope.ok).toBe(false);
    expect(envelope.error.code).toBe("UNKNOWN_VERB");
  });

  it("valid help forms keep exit 0: bare, noun, verb, and the mcp noun", () => {
    for (const argv of [
      ["--help"],
      ["block", "--help"],
      ["config", "show", "--help"],
      ["mcp", "--help"],
    ]) {
      expect(runCli(argv).exitCode, argv.join(" ")).toBe(0);
    }
  });
});

describe("--help does not bypass the global value guards (e2e)", () => {
  it("--help --format bogus exits 2 like its non-help twin", () => {
    const result = runCli(["--help", "--format", "bogus"]);
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('Invalid format "bogus"');
    expect(result.stderr).toContain("plain, llm, json");
  });

  it("--help --detail bogus exits 2, naming the valid levels", () => {
    const result = runCli(["config", "show", "--help", "--detail", "bogus"]);
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('Invalid detail "bogus"');
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
