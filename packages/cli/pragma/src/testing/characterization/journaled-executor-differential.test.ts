/**
 * Differential proof for the executor merge (4a): every generator the CLI
 * actually dispatches runs through the single journaled core
 * ({@link runGeneratorTask}) without hitting `JournalUnsupportedEffectError`,
 * and the run it records is a faithful, replayable artifact.
 *
 * The golden snapshots (executor-golden.test.ts) lock the *preview* modes
 * (dry-run/json/llm), which never execute. This locks the *real-execution*
 * path the merge rewired: journaling is safe for the real generators, the
 * recorded journal serialises, and replaying it reproduces the run performing
 * no I/O — the determinism guarantee resumable-wizard UX is built on.
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
import { generators as packageGenerators } from "@canonical/summon-package";
import {
  deserializeJournal,
  serializeJournal,
  type Task,
} from "@canonical/task";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { COMPONENT_GENERATORS } from "../../domains/create/generators.js";
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
    build: () => COMPONENT_GENERATORS.react.generate(componentParams),
  },
  {
    name: "component/svelte",
    build: () => COMPONENT_GENERATORS.svelte.generate(componentParams),
  },
  {
    name: "component/lit",
    build: () => COMPONENT_GENERATORS.lit.generate(componentParams),
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

describe("journaled executor — differential over the real generators", () => {
  let dir: string;
  let originalCwd: string;

  beforeEach(() => {
    originalCwd = process.cwd();
    dir = mkdtempSync(join(tmpdir(), "journaled-executor-diff-"));
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(dir, { recursive: true, force: true });
  });

  for (const testCase of cases) {
    it(`${testCase.name} — records a replayable journal and writes its files`, async () => {
      const recordDir = join(dir, "record");
      mkdirSync(recordDir);
      const { journal } = await runGeneratorTask(testCase.build(), {
        cwd: recordDir,
      });

      // Journaling was safe: it captured a non-empty run that actually wrote
      // files, and every entry survives serialisation.
      expect(journal.entries.length).toBeGreaterThan(0);
      expect(journal.entries.some((e) => e.id.kind === "WriteFile")).toBe(true);
      expect(countFiles(recordDir)).toBeGreaterThan(0);
      expect(deserializeJournal(serializeJournal(journal))).toEqual(journal);
    });

    it(`${testCase.name} — replays from its journal performing no I/O`, async () => {
      const recordDir = join(dir, "record");
      mkdirSync(recordDir);
      const { journal } = await runGeneratorTask(testCase.build(), {
        cwd: recordDir,
      });

      // Replay a freshly-built task into an empty directory. Replay serves
      // recorded outcomes without I/O, so that directory stays empty — no
      // files the recorded run wrote get written again.
      const replayDir = join(dir, "replay");
      mkdirSync(replayDir);
      const persisted = deserializeJournal(serializeJournal(journal));
      await runGeneratorTask(testCase.build(), {
        cwd: replayDir,
        journal: persisted,
      });

      expect(countFiles(replayDir)).toBe(0);
    });
  }

  // A real setup task on the rewired production surface. setupMcp in force mode
  // writes root-relative config (no prompts, no home-dir writes), so it is safe
  // to record and replay in a sandbox — proving journal-by-default is sound for
  // the setup path, not only the generators.
  it("setup/mcp (force) — records a serialisable journal and replays with no I/O", async () => {
    const config = join(dir, "record", ".cursor", "mcp.json");

    const { journal } = await runGeneratorTask(
      setupMcp(join(dir, "record"), "cursor"),
    );

    expect(journal.entries.some((e) => e.id.kind === "WriteFile")).toBe(true);
    expect(existsSync(config)).toBe(true);
    expect(deserializeJournal(serializeJournal(journal))).toEqual(journal);

    // Remove what the recorded run wrote, then replay the same task against the
    // journal. Replay serves recorded outcomes without I/O, so the file is not
    // recreated.
    rmSync(join(dir, "record", ".cursor"), { recursive: true, force: true });
    const persisted = deserializeJournal(serializeJournal(journal));
    await runGeneratorTask(setupMcp(join(dir, "record"), "cursor"), {
      journal: persisted,
    });

    expect(existsSync(config)).toBe(false);
  });
});
