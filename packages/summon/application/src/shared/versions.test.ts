import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Effect, ExecResult } from "@canonical/task";
import { dryRunWith } from "@canonical/task";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readVersion, resolvePragmaVersion } from "./versions.js";

/**
 * A pass-through `node:fs` mock the `/$bunfs` case flips on: while
 * `interceptReads` is set, every `readFileSync` in this file's module graph
 * records its path and serves a DECOY manifest — simulating the hijacked
 * host where the walk's real-filesystem probes resolve. Off (the default),
 * reads pass through untouched for every other case.
 */
const fsControl = vi.hoisted(() => ({
  interceptReads: false,
  reads: [] as unknown[],
}));
vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return {
    ...actual,
    readFileSync: ((...args: Parameters<typeof actual.readFileSync>) => {
      if (fsControl.interceptReads) {
        fsControl.reads.push(args[0]);
        return JSON.stringify({
          name: "@canonical/summon-application",
          version: "7.7.7",
        });
      }
      return actual.readFileSync(...args);
    }) as typeof actual.readFileSync,
  };
});

/**
 * The workspace manifest, read by PATH (a sibling walk of the one the module
 * performs) — the tree-side expectation comes from here rather than a
 * hardcoded literal. Deliberately not a `require("…/package.json")`: neither
 * production manifest this module resolves exposes a `"./package.json"`
 * subpath in its exports map, so the subpath require throws under plain
 * Node — the very divergence the walk exists to close.
 */
const here = dirname(fileURLToPath(import.meta.url));
const manifestVersion = (manifestPath: string): string =>
  (JSON.parse(readFileSync(manifestPath, "utf-8")) as { version: string })
    .version;

/**
 * The registry tier, driven deterministically: interpret the Task with a
 * stubbed `Exec` result (the `dryRunWith` seam sibling task-based tests use,
 * e.g. summon-package's detectMonorepo), so the SUCCESS branch — tier 1, the
 * module's documented primary strategy — is pinned without a real registry.
 * Both offline subprocess cells are green precisely when tier 1 does NOT
 * run; only this describe fails when the tier dies uniformly (a changed
 * `exec` spawn shape, a drifted `npm view` output format, a broken SEMVER
 * parse).
 */
describe("resolvePragmaVersion (the registry tier)", () => {
  const runWithExec = (result: ExecResult) =>
    dryRunWith(
      resolvePragmaVersion(),
      new Map<string, (effect: Effect) => unknown>([["Exec", () => result]]),
    );

  const logLines = (effects: readonly Effect[]): string[] =>
    effects.flatMap((effect) =>
      effect._tag === "Log" ? [effect.message] : [],
    );

  // The offline fallback is the installed generator's own release line —
  // the workspace manifest, read the same way the tree-tier cases read it.
  const releaseLine = `^${manifestVersion(resolve(here, "../../package.json"))}`;

  it("pins ^<latest> and logs the registry line when npm answers a semver", () => {
    const result = runWithExec({ stdout: "1.2.3\n", stderr: "", exitCode: 0 });
    expect(result.value).toBe("^1.2.3");
    expect(logLines(result.effects)).toContain(
      "Pinning @canonical/* packages to ^1.2.3 (latest on npm).",
    );
  });

  it("falls back to the release line on a nonzero exit", () => {
    const result = runWithExec({ stdout: "", stderr: "boom", exitCode: 1 });
    expect(result.value).toBe(releaseLine);
    expect(logLines(result.effects)).toContain(
      `Could not reach npm for the latest @canonical/* version; ` +
        `pinning ${releaseLine} (from the installed generator).`,
    );
  });

  it("falls back to the release line on unparseable output", () => {
    const result = runWithExec({
      stdout: "not-a-version\n",
      stderr: "",
      exitCode: 0,
    });
    expect(result.value).toBe(releaseLine);
    expect(logLines(result.effects)).toContain(
      `Could not reach npm for the latest @canonical/* version; ` +
        `pinning ${releaseLine} (from the installed generator).`,
    );
  });
});
