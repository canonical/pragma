import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  describeEffect,
  getAffectedPaths,
  isWriteEffect,
  transformFileEffect,
} from "./effect.js";
import { executeEffect } from "./interpreter.js";
import { transformFile } from "./primitives.js";

describe("transformFileEffect (constructor)", () => {
  it("builds a TransformFile effect with the path and transform", () => {
    const fn = (s: string) => s.toUpperCase();
    const eff = transformFileEffect("/a.ts", fn);
    expect(eff).toMatchObject({ _tag: "TransformFile", path: "/a.ts" });
    expect((eff as { transform: (s: string) => string }).transform("x")).toBe(
      "X",
    );
  });

  it("has no default undo, but accepts one", () => {
    const noUndo = transformFileEffect("/a.ts", (s) => s);
    expect((noUndo as { undo?: unknown }).undo).toBeUndefined();

    const undoTask = { _tag: "Pure", value: undefined } as never;
    const withUndo = transformFileEffect("/a.ts", (s) => s, { undo: undoTask });
    expect((withUndo as { undo?: unknown }).undo).toBe(undoTask);
  });
});

describe("transformFile effect — utilities", () => {
  it("describeEffect names the path", () => {
    expect(describeEffect(transformFileEffect("/x.ts", (s) => s))).toBe(
      "Transform file: /x.ts",
    );
  });

  it("counts as a write effect", () => {
    expect(isWriteEffect(transformFileEffect("/x.ts", (s) => s))).toBe(true);
  });

  it("affects its own path", () => {
    expect(getAffectedPaths(transformFileEffect("/x.ts", (s) => s))).toEqual([
      "/x.ts",
    ]);
  });
});

describe("transformFile interpreter", () => {
  it("reads, transforms, and writes the file back", async () => {
    const dir = mkdtempSync(join(tmpdir(), "task-transform-"));
    const file = join(dir, "f.txt");
    writeFileSync(file, "hello", "utf-8");
    try {
      await executeEffect(
        transformFileEffect(file, (s) => `${s} world`),
        new Map(),
      );
      expect(readFileSync(file, "utf-8")).toBe("hello world");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("does not write when the transform returns the original content", async () => {
    const dir = mkdtempSync(join(tmpdir(), "task-transform-"));
    const file = join(dir, "f.txt");
    writeFileSync(file, "same", "utf-8");
    const before = readFileSync(file).length;
    try {
      await executeEffect(
        transformFileEffect(file, (s) => s),
        new Map(),
      );
      // unchanged content, file still intact
      expect(readFileSync(file, "utf-8")).toBe("same");
      expect(readFileSync(file).length).toBe(before);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("transformFile primitive", () => {
  it("returns an Effect task wrapping a TransformFile", () => {
    const task = transformFile("/a.ts", (s) => s);
    expect(task).toMatchObject({
      _tag: "Effect",
      effect: { _tag: "TransformFile", path: "/a.ts" },
    });
  });
});
