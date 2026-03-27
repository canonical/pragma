import { collectUndos, dryRun } from "@canonical/task";
import { describe, expect, it } from "vitest";
import appendExportToParentIndex from "./appendExportToParentIndex.js";
import dryRunWithFileState from "./dryRunWithFileState.js";

describe("appendExportToParentIndex", () => {
  it("appends export when index exists and export not present", () => {
    const result = dryRunWithFileState(
      appendExportToParentIndex("src/components", "Button"),
      {
        "src/components/index.ts": 'export * from "./Other/index.js";\n',
      },
    );

    const appendEffect = result.effects.find((e) => e._tag === "AppendFile");
    expect(appendEffect).toBeDefined();
    expect((appendEffect as { content: string }).content).toBe(
      'export * from "./Button/index.js";\n',
    );
  });

  it("does nothing when export is already present", () => {
    const result = dryRunWithFileState(
      appendExportToParentIndex("src/components", "Button"),
      {
        "src/components/index.ts": 'export * from "./Button/index.js";\n',
      },
    );

    const writeEffects = result.effects.filter(
      (e) => e._tag === "AppendFile" || e._tag === "WriteFile",
    );
    expect(writeEffects).toHaveLength(0);
  });

  it("creates new index file when it does not exist", () => {
    const result = dryRunWithFileState(
      appendExportToParentIndex("src/components", "Card"),
      {},
    );

    const writeEffect = result.effects.find((e) => e._tag === "WriteFile");
    expect(writeEffect).toBeDefined();
    expect((writeEffect as { path: string }).path).toBe(
      "src/components/index.ts",
    );
    expect((writeEffect as { content: string }).content).toBe(
      'export * from "./Card/index.js";\n',
    );
  });

  it("writeFile for new index has default undo (deleteFile)", () => {
    const task = appendExportToParentIndex("src/components", "Card");
    const undos = collectUndos(task);

    expect(undos.length).toBeGreaterThan(0);
    const undoEffects = dryRun(undos[0]).effects;
    expect(undoEffects[0]._tag).toBe("DeleteFile");
    expect((undoEffects[0] as { path: string }).path).toBe(
      "src/components/index.ts",
    );
  });

  it("appendFile carries custom undo (removeLineFromFile)", () => {
    const result = dryRunWithFileState(
      appendExportToParentIndex("src/components", "Button"),
      { "src/components/index.ts": "" },
    );

    const appendEffect = result.effects.find((e) => e._tag === "AppendFile");
    expect(appendEffect).toBeDefined();
    expect("undo" in (appendEffect as Record<string, unknown>)).toBe(true);
    expect((appendEffect as Record<string, unknown>).undo).toBeDefined();
  });
});
