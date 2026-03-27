/**
 * Undo integration tests for monorepo generator
 */

import { collectUndos, dryRun } from "@canonical/task";
import { describe, expect, it } from "vitest";
import { generator } from "../../monorepo/index.js";

const defaultAnswers = {
  name: "test-monorepo",
  description: "A test monorepo",
  license: "LGPL-3.0" as const,
  typescriptConfig: "@canonical/typescript-config-base",
  repository: "https://github.com/test/test-monorepo",
  bunVersion: "1.3.9",
  runInstall: false,
  initGit: false,
};

describe("monorepo generator undo plan", () => {
  it("produces undos for all generated files and directories", () => {
    const task = generator.generate(defaultAnswers);
    const undos = collectUndos(task);

    // 9 mkdirs + 19 templates × 2 = 47
    expect(undos.length).toBe(47);
  });

  it("exec effects (initGit, runInstall, chmod) produce no undos", () => {
    const withExec = {
      ...defaultAnswers,
      initGit: true,
      runInstall: true,
    };
    const withExecUndos = collectUndos(generator.generate(withExec));
    const withoutExecUndos = collectUndos(generator.generate(defaultAnswers));

    // exec effects (git init, bun install, chmod) have no default undo
    expect(withExecUndos.length).toBe(withoutExecUndos.length);
  });

  it("all undo effects are DeleteFile or DeleteDirectory", () => {
    const task = generator.generate(defaultAnswers);
    const undos = collectUndos(task);
    const tags = undos.flatMap((undo) =>
      dryRun(undo).effects.map((e) => e._tag),
    );

    for (const tag of tags) {
      expect(["DeleteFile", "DeleteDirectory"]).toContain(tag);
    }
  });

  it("includes undo for root directory", () => {
    const task = generator.generate(defaultAnswers);
    const undos = collectUndos(task);

    // First undo should be mkdir(repoDir) → DeleteDirectory
    const firstUndoEffects = dryRun(undos[0]).effects;
    expect(firstUndoEffects[0]._tag).toBe("DeleteDirectory");
    expect((firstUndoEffects[0] as { path: string }).path).toBe(
      "test-monorepo",
    );
  });
});
