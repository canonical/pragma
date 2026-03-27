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
      withSsrTests: false,
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
      withSsrTests: false,
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
      withSsrTests: false,
    });
    const undos = collectUndos(task);
    const tags = getUndoEffectTags(undos);

    for (const tag of tags) {
      expect(["DeleteFile", "DeleteDirectory"]).toContain(tag);
    }
  });
});
