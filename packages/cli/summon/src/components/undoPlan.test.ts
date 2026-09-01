import {
  deleteFile,
  type Effect,
  execEffect,
  flatMap,
  pure,
  readFile,
  type Task,
} from "@canonical/task";
import { describe, expect, it } from "vitest";
import {
  describeUndoSteps,
  isUnreversibleExec,
  shouldSkipUndoGate,
} from "./undoPlan.js";

describe("describeUndoSteps", () => {
  it("lists the plan in execution order (reverse of collection order)", () => {
    const undos: Task<void>[] = [
      deleteFile("first-created.ts"),
      deleteFile("second-created.ts"),
    ];

    const plan = describeUndoSteps(undos);

    expect(plan.map((effect) => "path" in effect && effect.path)).toEqual([
      "second-created.ts",
      "first-created.ts",
    ]);
  });

  it("shows a revert line for an undo whose dry-run yields only reads", () => {
    // Shaped like removeLineFromFile's undo: reads the file, and because
    // dry-run mocks reads the target line is absent, so no write surfaces.
    const removeLineShaped: Task<void> = flatMap(
      readFile("parent/index.ts"),
      () => pure(undefined),
    );

    const plan = describeUndoSteps([removeLineShaped]);

    expect(plan).toHaveLength(1);
    expect(plan[0]).toMatchObject({
      _tag: "Log",
      message: "Revert changes in parent/index.ts",
    });
  });

  it("shows one entry per step, mixing visible and revert lines", () => {
    const removeLineShaped: Task<void> = flatMap(
      readFile("parent/index.ts"),
      () => pure(undefined),
    );
    const plan = describeUndoSteps([
      deleteFile("Button/index.ts"),
      removeLineShaped,
    ]);

    expect(plan).toHaveLength(2);
    expect(plan[0]?._tag).toBe("Log");
    expect(plan[1]).toMatchObject({ _tag: "DeleteFile" });
  });
});

describe("isUnreversibleExec", () => {
  it("flags an exec without an undo as residue", () => {
    expect(isUnreversibleExec(execEffect("bun", ["install"]))).toBe(true);
  });

  it("does not flag an exec that carries its own undo", () => {
    const reversible = execEffect("git", ["init"], undefined, {
      undo: pure(undefined),
    });
    expect(isUnreversibleExec(reversible)).toBe(false);
  });

  it("ignores non-exec effects", () => {
    const write: Effect = {
      _tag: "WriteFile",
      path: "a.ts",
      content: "",
      overwrite: true,
    };
    expect(isUnreversibleExec(write)).toBe(false);
  });
});

describe("shouldSkipUndoGate", () => {
  it("gates when answers came from flags alone", () => {
    expect(shouldSkipUndoGate({ yes: false, preview: true })).toBe(false);
  });

  it("skips the gate with --yes", () => {
    expect(shouldSkipUndoGate({ yes: true, preview: true })).toBe(true);
  });

  it("skips the gate with --no-preview", () => {
    expect(shouldSkipUndoGate({ yes: false, preview: false })).toBe(true);
  });
});
