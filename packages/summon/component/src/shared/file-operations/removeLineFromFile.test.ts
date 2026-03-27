import { collectUndos } from "@canonical/task";
import { describe, expect, it } from "vitest";
import dryRunWithFileState from "./dryRunWithFileState.js";
import removeLineFromFile from "./removeLineFromFile.js";

describe("removeLineFromFile", () => {
  it("removes a matching line from multi-line content", () => {
    const result = dryRunWithFileState(
      removeLineFromFile("/src/index.ts", "line2"),
      { "/src/index.ts": "line1\nline2\nline3" },
    );

    const writeEffect = result.effects.find((e) => e._tag === "WriteFile");
    expect(writeEffect).toBeDefined();
    expect((writeEffect as { content: string }).content).toBe("line1\nline3");
  });

  it("writes back content when line is not present", () => {
    const result = dryRunWithFileState(
      removeLineFromFile("/src/index.ts", "nonexistent"),
      { "/src/index.ts": "line1\nline3" },
    );

    const writeEffect = result.effects.find((e) => e._tag === "WriteFile");
    expect(writeEffect).toBeDefined();
    expect((writeEffect as { content: string }).content).toBe("line1\nline3");
  });

  it("deletes file when content becomes empty after removal", () => {
    const result = dryRunWithFileState(
      removeLineFromFile("/src/index.ts", "only-line"),
      { "/src/index.ts": "only-line\n" },
    );

    const deleteEffect = result.effects.find((e) => e._tag === "DeleteFile");
    expect(deleteEffect).toBeDefined();
    expect((deleteEffect as { path: string }).path).toBe("/src/index.ts");
  });

  it("trims whitespace when matching lines", () => {
    const result = dryRunWithFileState(
      removeLineFromFile("/src/index.ts", "  target  "),
      { "/src/index.ts": "before\n  target  \nafter" },
    );

    const writeEffect = result.effects.find((e) => e._tag === "WriteFile");
    expect(writeEffect).toBeDefined();
    expect((writeEffect as { content: string }).content).toBe("before\nafter");
  });

  it("removes all matching lines", () => {
    const result = dryRunWithFileState(
      removeLineFromFile("/src/index.ts", "dup"),
      { "/src/index.ts": "dup\nkeep\ndup" },
    );

    const writeEffect = result.effects.find((e) => e._tag === "WriteFile");
    expect(writeEffect).toBeDefined();
    expect((writeEffect as { content: string }).content).toBe("keep");
  });

  it("uses { undo: null } on internal effects to prevent undo chains", () => {
    const undos = collectUndos(removeLineFromFile("/src/index.ts", "line"));
    expect(undos).toHaveLength(0);
  });
});
