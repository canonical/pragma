import { describe, expect, it } from "vitest";
import dryRunWithFileState from "./dryRunWithFileState.js";
import removeExportFromParentIndex from "./removeExportFromParentIndex.js";

describe("removeExportFromParentIndex", () => {
  it("removes export when index exists with the export", () => {
    const result = dryRunWithFileState(
      removeExportFromParentIndex("src/components", "Button"),
      {
        "src/components/index.ts":
          'export * from "./Button/index.js";\nexport * from "./Card/index.js";\n',
      },
    );

    const writeEffect = result.effects.find((e) => e._tag === "WriteFile");
    expect(writeEffect).toBeDefined();
    expect((writeEffect as { content: string }).content).not.toContain(
      "Button",
    );
    expect((writeEffect as { content: string }).content).toContain("Card");
  });

  it("does nothing when index does not exist", () => {
    const result = dryRunWithFileState(
      removeExportFromParentIndex("src/components", "Button"),
      {},
    );

    const writeEffects = result.effects.filter(
      (e) =>
        e._tag === "WriteFile" ||
        e._tag === "DeleteFile" ||
        e._tag === "AppendFile",
    );
    expect(writeEffects).toHaveLength(0);
  });

  it("deletes index if removing export leaves it empty", () => {
    const result = dryRunWithFileState(
      removeExportFromParentIndex("src/components", "Button"),
      {
        "src/components/index.ts":
          'export * from "./Button/index.js";\n',
      },
    );

    const deleteEffect = result.effects.find((e) => e._tag === "DeleteFile");
    expect(deleteEffect).toBeDefined();
    expect((deleteEffect as { path: string }).path).toBe(
      "src/components/index.ts",
    );
  });
});
