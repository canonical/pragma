/**
 * A10 — auto-LLM output-mode selection, observed through the real binary.
 *
 * `parseGlobalFlags`'s auto-LLM RULE is PR1-protected at the unit level
 * (`globalFlags.test.ts`, with an injected `OutputEnvironment`). What only a
 * spawn can prove is the OBSERVABLE consequence: a piped `pragma` process
 * (the shape an agent captures) really does default to condensed Markdown
 * with no flag. `runCli`/`spawnSync` always pipes stdout — there is no
 * practical way to allocate a real TTY in this harness to exercise the
 * opposite (interactive) branch, which stays a PR1 unit concern
 * (`isTty: true` injected).
 */

import { describe, expect, it } from "vitest";
import { runCli } from "../helpers/runCli.js";

describe("auto-LLM on a piped (non-TTY) stdout (A10, e2e)", () => {
  it("defaults to condensed Markdown with no flag", () => {
    const result = runCli(["info"]);
    expect(result.exitCode).toBe(0);
    // llm formatters render a Markdown heading; plain does not.
    expect(result.stdout).toMatch(/^#/);
  });

  it("--format json disables auto-llm even when piped", () => {
    const result = runCli(["info", "--format", "json"]);
    expect(result.exitCode).toBe(0);
    expect(() => JSON.parse(result.stdout)).not.toThrow();
    expect(result.stdout.startsWith("#")).toBe(false);
  });

  it("PRAGMA_NO_AUTO_LLM keeps plain output when piped", () => {
    const result = runCli(["info"], { env: { PRAGMA_NO_AUTO_LLM: "1" } });
    expect(result.exitCode).toBe(0);
    expect(result.stdout.startsWith("#")).toBe(false);
    expect(result.stdout).toContain("pragma v");
  });

  it("an explicit --llm matches the auto-selected output", () => {
    const auto = runCli(["info"]);
    const explicit = runCli(["info", "--llm"]);
    expect(explicit.stdout).toBe(auto.stdout);
  });
});
