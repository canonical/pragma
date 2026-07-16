/**
 * End-to-end characterization of the real-execution path the executor merge
 * (4a) rewired: every generator the CLI actually dispatches, and a real setup
 * task, run through the shared UI-free core ({@link runGeneratorTask}) and
 * produce their files on disk.
 *
 * The golden snapshots (executor-golden.test.ts) lock the *preview* modes
 * (dry-run/json/llm), which never execute. This locks the *real* run: the
 * merged core executes the genuine task trees — not test doubles — with the
 * correct working-directory semantics.
 */

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runGeneratorTask } from "@canonical/cli-core";
import { generators as componentGenerators } from "@canonical/summon-component";
import { generators as packageGenerators } from "@canonical/summon-package";
import type { Task } from "@canonical/task";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import setupMcp from "../../domains/setup/operations/setupMcp.js";

interface Case {
  readonly name: string;
  readonly build: () => Task<unknown>;
}

const componentParams = { componentPath: "src/components/Button" };
const packageParams = { name: "@canonical/example", type: "library" };

const cases: Case[] = [
  {
    name: "component/react",
    build: () =>
      componentGenerators["component/react"].generate(componentParams),
  },
  {
    name: "component/svelte",
    build: () =>
      componentGenerators["component/svelte"].generate(componentParams),
  },
  {
    name: "component/lit",
    build: () => componentGenerators["component/lit"].generate(componentParams),
  },
  {
    name: "package/library",
    build: () => packageGenerators.package.generate(packageParams),
  },
];

const countFiles = (root: string): number => {
  let total = 0;
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    total += entry.isDirectory() ? countFiles(join(root, entry.name)) : 1;
  }
  return total;
};

describe("shared executor — real execution over the dispatched tasks", () => {
  let dir: string;
  let originalCwd: string;

  beforeEach(() => {
    originalCwd = process.cwd();
    dir = mkdtempSync(join(tmpdir(), "executor-execution-"));
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(dir, { recursive: true, force: true });
  });

  for (const testCase of cases) {
    it(`${testCase.name} — executes for real in the target cwd`, async () => {
      const targetDir = join(dir, "target");
      mkdirSync(targetDir);

      await runGeneratorTask(testCase.build(), { cwd: targetDir });

      expect(countFiles(targetDir)).toBeGreaterThan(0);
      expect(process.cwd()).toBe(originalCwd);
    });
  }

  // A real setup task on the rewired production surface. setupMcp in force
  // mode writes root-relative config (no prompts, no home-dir writes), so it
  // is safe to execute in a sandbox.
  it("setup/mcp (force) — writes the harness config for real", async () => {
    const root = join(dir, "project");
    mkdirSync(root);

    await runGeneratorTask(setupMcp(root, "cursor"));

    expect(existsSync(join(root, ".cursor", "mcp.json"))).toBe(true);
  });
});
