/**
 * Undo integration tests for component generators
 *
 * Verifies that collectUndos produces correct undo plans for each generator.
 * Each template() call produces 2 undos: mkdir(destDir) + writeFile(dest).
 * Plus the generator's own mkdir(componentDir) and appendExportToParentIndex.
 */

import { collectUndos, dryRun } from "@canonical/task";
import { describe, expect, it } from "vitest";
import { generators } from "../../index.js";

// =============================================================================
// Helpers
// =============================================================================

/** Collect all undo effect tags from a generator task */
const getUndoEffectTags = (undos: ReturnType<typeof collectUndos>) =>
  undos.flatMap((undo) => dryRun(undo).effects.map((e) => e._tag));

// =============================================================================
// React
// =============================================================================

describe("component/react undo plan", () => {
  const generator = generators["component/react"];

  it("produces undos for full component (all options)", () => {
    const task = generator.generate({
      componentPath: "src/components/Button",
      withStyles: true,
      withStories: true,
      withSsrTests: true,
    });
    const undos = collectUndos(task);

    // 1 mkdir(componentDir) + 7 templates × 2 + 1 appendExport(writeFile) = 16
    expect(undos.length).toBeGreaterThan(0);
    expect(undos.length).toBe(16);
  });

  it("produces fewer undos for minimal component", () => {
    const fullTask = generator.generate({
      componentPath: "src/components/Button",
      withStyles: true,
      withStories: true,
      withSsrTests: true,
    });
    const minTask = generator.generate({
      componentPath: "src/components/Button",
      withStyles: false,
      withStories: false,
      withSsrTests: false,
    });

    const fullUndos = collectUndos(fullTask);
    const minUndos = collectUndos(minTask);

    expect(minUndos.length).toBeLessThan(fullUndos.length);
    // 1 mkdir + 4 templates × 2 + 1 appendExport = 10
    expect(minUndos.length).toBe(10);
  });

  it("undo effects are only DeleteFile and DeleteDirectory", () => {
    const task = generator.generate({
      componentPath: "src/components/Button",
      withStyles: true,
      withStories: true,
      withSsrTests: true,
    });
    const undos = collectUndos(task);
    const tags = getUndoEffectTags(undos);

    for (const tag of tags) {
      expect(["DeleteFile", "DeleteDirectory"]).toContain(tag);
    }
  });

  it("undo includes DeleteDirectory for component dir", () => {
    const task = generator.generate({
      componentPath: "src/components/Card",
      withStyles: false,
      withStories: false,
      withSsrTests: false,
    });
    const undos = collectUndos(task);

    // First undo should be the mkdir(componentDir) → DeleteDirectory
    const firstUndoEffects = dryRun(undos[0]).effects;
    expect(firstUndoEffects[0]._tag).toBe("DeleteDirectory");
    expect((firstUndoEffects[0] as { path: string }).path).toBe(
      "src/components/Card",
    );
  });
});

// =============================================================================
// Pre-existing parent index (host-backed Exists resolution)
// =============================================================================

describe("undo plan against a pre-existing parent index", () => {
  // Regression: collecting undos with a blank filesystem always took the
  // create branch of appendExportToParentIndex, so `--undo` deleted a barrel
  // index.ts that existed before the forward run. With a host-backed
  // resolveExists (what runUndo supplies), collection must take the append
  // branch and keep the barrel.
  const generator = generators["component/react"];
  const parentIndex = "src/components/index.ts";
  const answers = {
    componentPath: "src/components/Button",
    withStyles: true,
    withStories: true,
    withSsrTests: true,
  };
  const resolveExists = (p: string) => p === parentIndex;

  it("never deletes the pre-existing parent index", () => {
    const undos = collectUndos(generator.generate(answers), { resolveExists });

    const indexDeletes = undos
      .flatMap((undo) => dryRun(undo).effects)
      .filter(
        (e) =>
          e._tag === "DeleteFile" &&
          (e as { path: string }).path === parentIndex,
      );
    expect(indexDeletes).toHaveLength(0);
    // Same step count as the create branch: the append contributes its
    // remove-line undo instead of a DeleteFile.
    expect(undos.length).toBe(16);
  });

  it("collects the remove-line undo for the barrel append", () => {
    const undos = collectUndos(generator.generate(answers), { resolveExists });

    // The appendExport step is the generator's last undoable effect; its undo
    // reads the barrel to strip just the appended line rather than delete it.
    const lastUndoEffects = dryRun(undos[undos.length - 1]).effects;
    expect(lastUndoEffects[0]._tag).toBe("ReadFile");
    expect((lastUndoEffects[0] as { path: string }).path).toBe(parentIndex);
  });
});

// =============================================================================
// Svelte
// =============================================================================

describe("component/svelte undo plan", () => {
  const generator = generators["component/svelte"];

  it("produces undos for full component (all options)", () => {
    const task = generator.generate({
      componentPath: "src/lib/components/Button",
      withStyles: true,
      withStories: true,
      useTsStories: false,
      withSsrTests: true,
    });
    const undos = collectUndos(task);

    // 1 mkdir + 7 templates × 2 + 1 appendExport = 16
    expect(undos.length).toBe(16);
  });

  it("TS stories and Svelte CSF stories produce same undo count", () => {
    const svelteCSF = generator.generate({
      componentPath: "src/lib/components/Button",
      withStyles: false,
      withStories: true,
      useTsStories: false,
      withSsrTests: false,
    });
    const tsStories = generator.generate({
      componentPath: "src/lib/components/Button",
      withStyles: false,
      withStories: true,
      useTsStories: true,
      withSsrTests: false,
    });

    expect(collectUndos(svelteCSF).length).toBe(collectUndos(tsStories).length);
  });

  it("produces fewer undos for minimal component", () => {
    const minTask = generator.generate({
      componentPath: "src/lib/components/Button",
      withStyles: false,
      withStories: false,
      useTsStories: false,
      withSsrTests: false,
    });
    const minUndos = collectUndos(minTask);

    // 1 mkdir + 4 templates × 2 + 1 appendExport = 10
    expect(minUndos.length).toBe(10);
  });
});

// =============================================================================
// Lit
// =============================================================================

describe("component/lit undo plan", () => {
  const generator = generators["component/lit"];

  it("produces undos for full component (all options)", () => {
    const task = generator.generate({
      componentPath: "src/lib/components/Button",
      withStyles: true,
      withStories: true,
    });
    const undos = collectUndos(task);

    // 1 mkdir + 6 templates × 2 + 1 appendExport = 14
    // (lit has: component, index, types, tests, stories, styles = 6 templates)
    expect(undos.length).toBe(14);
  });

  it("produces fewer undos for minimal component", () => {
    const minTask = generator.generate({
      componentPath: "src/lib/components/Button",
      withStyles: false,
      withStories: false,
    });
    const minUndos = collectUndos(minTask);

    // 1 mkdir + 4 templates × 2 + 1 appendExport = 10
    expect(minUndos.length).toBe(10);
  });

  it("undo effects are only DeleteFile and DeleteDirectory", () => {
    const task = generator.generate({
      componentPath: "src/lib/components/Widget",
      withStyles: true,
      withStories: true,
    });
    const undos = collectUndos(task);
    const tags = getUndoEffectTags(undos);

    for (const tag of tags) {
      expect(["DeleteFile", "DeleteDirectory"]).toContain(tag);
    }
  });
});
