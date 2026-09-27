import { type Effect, execEffect, pure } from "@canonical/task";
import { describe, expect, it } from "vitest";
import { isUnreversibleExec, shouldSkipUndoGate } from "./undoPlan.js";

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
