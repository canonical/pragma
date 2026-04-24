import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parallel, sequence_, when } from "./combinators.js";
import { dryRun } from "./dry-run.js";
import { TaskExecutionError } from "./interpreter.js";
import {
  appendFile,
  copyDirectory,
  copyFile,
  exec,
  exists,
  info,
  mkdir,
  readFile,
  symlink,
  writeFile,
} from "./primitives.js";
import { $, effect, fail, gen, pure } from "./task.js";
import type { Task } from "./types.js";
import { collectUndos, runUndo } from "./undo-interpreter.js";

// =============================================================================
// collectUndos
// =============================================================================

describe("collectUndos", () => {
  it("collects default undos from writeFile", () => {
    const task = writeFile("/tmp/a.txt", "hello");
    const undos = collectUndos(task);

    expect(undos).toHaveLength(1);
    const effects = dryRun(undos[0]).effects;
    expect(effects).toHaveLength(1);
    expect(effects[0]._tag).toBe("DeleteFile");
    if (effects[0]._tag === "DeleteFile") {
      expect(effects[0].path).toBe("/tmp/a.txt");
    }
  });

  it("collects default undos from mkdir", () => {
    const task = mkdir("/tmp/mydir");
    const undos = collectUndos(task);

    expect(undos).toHaveLength(1);
    const effects = dryRun(undos[0]).effects;
    expect(effects[0]._tag).toBe("DeleteDirectory");
  });

  it("collects default undos from copyFile", () => {
    const task = copyFile("/src/a.txt", "/dest/a.txt");
    const undos = collectUndos(task);

    expect(undos).toHaveLength(1);
    const effects = dryRun(undos[0]).effects;
    expect(effects[0]._tag).toBe("DeleteFile");
    if (effects[0]._tag === "DeleteFile") {
      expect(effects[0].path).toBe("/dest/a.txt");
    }
  });

  it("collects default undos from copyDirectory", () => {
    const task = copyDirectory("/src/dir", "/dest/dir");
    const undos = collectUndos(task);

    expect(undos).toHaveLength(1);
    const effects = dryRun(undos[0]).effects;
    expect(effects[0]._tag).toBe("DeleteDirectory");
    if (effects[0]._tag === "DeleteDirectory") {
      expect(effects[0].path).toBe("/dest/dir");
    }
  });

  it("collects default undos from symlink", () => {
    const task = symlink("/target", "/link");
    const undos = collectUndos(task);

    expect(undos).toHaveLength(1);
    const effects = dryRun(undos[0]).effects;
    expect(effects[0]._tag).toBe("DeleteFile");
    if (effects[0]._tag === "DeleteFile") {
      expect(effects[0].path).toBe("/link");
    }
  });

  it("collects no undos from appendFile (no default)", () => {
    const task = appendFile("/tmp/a.txt", "line\n");
    const undos = collectUndos(task);

    expect(undos).toHaveLength(0);
  });

  it("collects no undos from exec (no default)", () => {
    const task = exec("echo", ["hello"]);
    const undos = collectUndos(task);

    expect(undos).toHaveLength(0);
  });

  it("collects no undos from read-only effects", () => {
    const task = sequence_([
      readFile("/tmp/a.txt"),
      exists("/tmp/b.txt"),
      info("hello"),
    ]);
    const undos = collectUndos(task);

    expect(undos).toHaveLength(0);
  });

  it("collects custom undo override", () => {
    const customUndo = info("custom cleanup");
    const task = appendFile("/tmp/a.txt", "line\n", true, {
      undo: customUndo,
    });
    const undos = collectUndos(task);

    expect(undos).toHaveLength(1);
    const effects = dryRun(undos[0]).effects;
    expect(effects[0]._tag).toBe("Log");
  });

  it("collects no undo when explicitly disabled with null", () => {
    const task = writeFile("/tmp/a.txt", "hello", { undo: null });
    const undos = collectUndos(task);

    expect(undos).toHaveLength(0);
  });

  it("collects undos from a sequence in forward order", () => {
    const task = sequence_([
      mkdir("/tmp/dir"),
      writeFile("/tmp/dir/a.txt", "a"),
      writeFile("/tmp/dir/b.txt", "b"),
    ]);
    const undos = collectUndos(task);

    expect(undos).toHaveLength(3);
    // Forward order: mkdir, writeFile(a), writeFile(b)
    const eff0 = dryRun(undos[0]).effects;
    const eff1 = dryRun(undos[1]).effects;
    const eff2 = dryRun(undos[2]).effects;
    expect(eff0[0]._tag).toBe("DeleteDirectory");
    expect(eff1[0]._tag).toBe("DeleteFile");
    expect(eff2[0]._tag).toBe("DeleteFile");
  });

  it("handles conditional tasks — skipped branches produce no undos", () => {
    const task = sequence_([
      writeFile("/tmp/a.txt", "a"),
      when(false, writeFile("/tmp/b.txt", "b")),
      writeFile("/tmp/c.txt", "c"),
    ]);
    const undos = collectUndos(task);

    // Only a.txt and c.txt — b.txt was skipped by when(false, ...)
    expect(undos).toHaveLength(2);
  });

  it("handles conditional tasks — taken branches produce undos", () => {
    const task = sequence_([
      writeFile("/tmp/a.txt", "a"),
      when(true, writeFile("/tmp/b.txt", "b")),
      writeFile("/tmp/c.txt", "c"),
    ]);
    const undos = collectUndos(task);

    expect(undos).toHaveLength(3);
  });

  it("handles gen() syntax", () => {
    const task = gen(function* () {
      yield* $(mkdir("/tmp/dir"));
      yield* $(writeFile("/tmp/dir/file.txt", "content"));
      yield* $(info("done"));
    });
    const undos = collectUndos(task);

    // mkdir and writeFile have default undos, info does not
    expect(undos).toHaveLength(2);
  });

  it("handles mixed undoable and non-undoable effects", () => {
    const task = sequence_([
      info("Starting..."),
      mkdir("/tmp/dir"),
      readFile("/tmp/existing.txt"),
      writeFile("/tmp/dir/new.txt", "content"),
      exec("echo", ["done"]),
      info("Complete"),
    ]);
    const undos = collectUndos(task);

    // Only mkdir and writeFile have default undos
    expect(undos).toHaveLength(2);
  });

  it("returns empty undos for pure task", () => {
    const undos = collectUndos(pure(undefined));
    expect(undos).toHaveLength(0);
  });

  it("collects undos from deeply nested sequences", () => {
    const task = sequence_([
      sequence_([writeFile("/a.txt", "a"), writeFile("/b.txt", "b")]),
      sequence_([mkdir("/dir"), writeFile("/dir/c.txt", "c")]),
    ]);
    const undos = collectUndos(task);

    expect(undos).toHaveLength(4);
  });

  it("collects mixed custom and default undos in same sequence", () => {
    const customUndo = info("remove b line");
    const task = sequence_([
      writeFile("/a.txt", "x"),
      appendFile("/b.txt", "y\n", true, { undo: customUndo }),
      mkdir("/c"),
    ]);
    const undos = collectUndos(task);

    expect(undos).toHaveLength(3);

    // First undo: default deleteFile for writeFile(/a.txt)
    const eff0 = dryRun(undos[0]).effects;
    expect(eff0[0]._tag).toBe("DeleteFile");

    // Second undo: custom undo (info log)
    const eff1 = dryRun(undos[1]).effects;
    expect(eff1[0]._tag).toBe("Log");

    // Third undo: default deleteDirectory for mkdir(/c)
    const eff2 = dryRun(undos[2]).effects;
    expect(eff2[0]._tag).toBe("DeleteDirectory");
  });

  it("skipped when(false) with custom undo produces no undos", () => {
    const customUndo = info("should not appear");
    const task = sequence_([
      writeFile("/a.txt", "a"),
      when(false, appendFile("/b.txt", "y\n", true, { undo: customUndo })),
      writeFile("/c.txt", "c"),
    ]);
    const undos = collectUndos(task);

    // Only a.txt and c.txt — the when(false) branch is skipped
    expect(undos).toHaveLength(2);
  });

  it("collects custom undo that is itself a sequence", () => {
    const compositeUndo = sequence_([info("step 1"), info("step 2")]);
    const task = writeFile("/a.txt", "a", { undo: compositeUndo });
    const undos = collectUndos(task);

    expect(undos).toHaveLength(1);
    // The composite undo produces 2 Log effects
    const undoEffects = dryRun(undos[0]).effects;
    expect(undoEffects).toHaveLength(2);
    expect(undoEffects[0]._tag).toBe("Log");
    expect(undoEffects[1]._tag).toBe("Log");
  });

  it("handles gen() with multiple yields and mixed undo types", () => {
    const task = gen(function* () {
      yield* $(info("starting"));
      yield* $(mkdir("/dir"));
      yield* $(writeFile("/dir/a.txt", "a"));
      yield* $(appendFile("/dir/b.txt", "b\n"));
      yield* $(writeFile("/dir/c.txt", "c"));
      yield* $(info("done"));
    });
    const undos = collectUndos(task);

    // mkdir=1 + writeFile(a)=1 + appendFile=0 + writeFile(c)=1 = 3
    expect(undos).toHaveLength(3);
  });

  it("throws TaskExecutionError for Fail nodes", () => {
    const task = fail({ code: "ERR", message: "boom" });

    expect(() => collectUndos(task)).toThrow(TaskExecutionError);
  });

  it("collects undos from Parallel children", () => {
    const task = parallel([
      writeFile("/a.txt", "a"),
      writeFile("/b.txt", "b"),
      mkdir("/dir"),
    ]);
    const undos = collectUndos(task);

    // Each child has a default undo (DeleteFile for writes, DeleteDirectory for mkdir)
    expect(undos).toHaveLength(3);
  });

  it("collects undos from Race — only first child", () => {
    const task = effect<unknown>({
      _tag: "Race",
      tasks: [writeFile("/a.txt", "a"), writeFile("/b.txt", "b")],
    });
    const undos = collectUndos(task);

    // Only the first child is walked
    expect(undos).toHaveLength(1);
    const eff = dryRun(undos[0]).effects;
    expect(eff[0]._tag).toBe("DeleteFile");
    if (eff[0]._tag === "DeleteFile") {
      expect(eff[0].path).toBe("/a.txt");
    }
  });

  it("collects no undos from Race with empty tasks", () => {
    const task = effect<unknown>({
      _tag: "Race",
      tasks: [],
    });
    const undos = collectUndos(task);

    expect(undos).toHaveLength(0);
  });

  it("tracks virtual filesystem state for Exists through writeFile", () => {
    // A task that writes a file, then checks if it exists
    const task = gen(function* () {
      yield* $(writeFile("/tmp/marker.txt", "x"));
      const found = yield* $(exists("/tmp/marker.txt"));
      if (found) {
        yield* $(writeFile("/tmp/result.txt", "found"));
      }
    });
    const undos = collectUndos(task);

    // writeFile(marker) + writeFile(result) each produce an undo
    expect(undos).toHaveLength(2);
  });

  it("tracks virtual filesystem state for Exists through mkdir", () => {
    const task = gen(function* () {
      yield* $(mkdir("/tmp/newdir"));
      const found = yield* $(exists("/tmp/newdir"));
      if (found) {
        yield* $(writeFile("/tmp/newdir/file.txt", "content"));
      }
    });
    const undos = collectUndos(task);

    // mkdir + writeFile
    expect(undos).toHaveLength(2);
  });

  it("tracks virtual filesystem state for Exists through symlink", () => {
    const task = gen(function* () {
      yield* $(symlink("/target", "/tmp/link"));
      const found = yield* $(exists("/tmp/link"));
      if (found) {
        yield* $(writeFile("/tmp/done.txt", "yes"));
      }
    });
    const undos = collectUndos(task);

    // symlink + writeFile
    expect(undos).toHaveLength(2);
  });

  it("tracks virtual filesystem state for Exists through appendFile", () => {
    const task = gen(function* () {
      yield* $(appendFile("/tmp/log.txt", "entry\n"));
      const found = yield* $(exists("/tmp/log.txt"));
      if (found) {
        yield* $(writeFile("/tmp/done.txt", "yes"));
      }
    });
    const undos = collectUndos(task);

    // appendFile has no default undo, writeFile does
    expect(undos).toHaveLength(1);
  });

  it("collects undos from nested Parallel within a sequence", () => {
    const task = sequence_([
      writeFile("/a.txt", "a"),
      parallel([writeFile("/b.txt", "b"), mkdir("/dir")]),
      writeFile("/c.txt", "c"),
    ]);
    const undos = collectUndos(task);

    // writeFile(a) + writeFile(b) + mkdir + writeFile(c)
    expect(undos).toHaveLength(4);
  });

  it("collects undos from Parallel child that has Fail — throws", () => {
    const task = parallel([
      writeFile("/a.txt", "a"),
      fail({ code: "ERR", message: "child fail" }),
    ]);

    expect(() => collectUndos(task)).toThrow(TaskExecutionError);
  });

  it("collects undos from Race child with nested sequence", () => {
    const task = effect<unknown>({
      _tag: "Race",
      tasks: [
        sequence_([writeFile("/a.txt", "a"), writeFile("/b.txt", "b")]),
        writeFile("/c.txt", "c"),
      ],
    });
    const undos = collectUndos(task);

    // Only first child is walked: writeFile(a) + writeFile(b)
    expect(undos).toHaveLength(2);
  });

  it("handles Parallel inside Parallel child (nested)", () => {
    const inner = parallel([
      writeFile("/x.txt", "x"),
      writeFile("/y.txt", "y"),
    ]);
    const task = parallel([inner, writeFile("/z.txt", "z")]);
    const undos = collectUndos(task);

    // inner children: x, y + outer child: z
    expect(undos).toHaveLength(3);
  });

  it("handles Race inside collectUndosWithVirtualFs (via Parallel child)", () => {
    const raceChild = effect<unknown>({
      _tag: "Race",
      tasks: [writeFile("/first.txt", "f"), writeFile("/second.txt", "s")],
    });
    const task = parallel([raceChild, writeFile("/other.txt", "o")]);
    const undos = collectUndos(task);

    // Race takes first child: writeFile(first) + writeFile(other)
    expect(undos).toHaveLength(2);
  });

  it("handles Race with empty tasks inside Parallel child", () => {
    const emptyRace = effect<unknown>({
      _tag: "Race",
      tasks: [],
    });
    const task = parallel([emptyRace, writeFile("/a.txt", "a")]);
    const undos = collectUndos(task);

    // Only writeFile(a)
    expect(undos).toHaveLength(1);
  });

  it("handles Fail inside collectUndosWithVirtualFs", () => {
    const failTask: Task<void> = fail({ code: "ERR", message: "nested fail" });
    const task = parallel([failTask]);

    expect(() => collectUndos(task)).toThrow(TaskExecutionError);
  });
});

// =============================================================================
// runUndo
// =============================================================================

describe("runUndo", () => {
  it("executes undo tasks in reverse (LIFO) order", async () => {
    const order: string[] = [];

    // Custom undos that log to context to track execution order
    const makeUndoLogger = (label: string) =>
      effect<void>({
        _tag: "WriteContext",
        key: `_undo_${label}`,
        value: true,
      });

    const context = new Map<string, unknown>();
    const onEffectComplete = (eff: import("./types.js").Effect) => {
      if (eff._tag === "WriteContext" && typeof eff.key === "string") {
        order.push(eff.key);
      }
    };

    const task = sequence_([
      writeFile("/tmp/a.txt", "a", { undo: makeUndoLogger("a") }),
      writeFile("/tmp/b.txt", "b", { undo: makeUndoLogger("b") }),
      writeFile("/tmp/c.txt", "c", { undo: makeUndoLogger("c") }),
    ]);

    const result = await runUndo(task, { context, onEffectComplete });

    expect(result.undoCount).toBe(3);
    // LIFO: c, b, a
    expect(order).toEqual(["_undo_c", "_undo_b", "_undo_a"]);
  });

  it("returns undoCount 0 for task with no undoable effects", async () => {
    const task = sequence_([info("hello"), info("world")]);
    const result = await runUndo(task);

    expect(result.undoCount).toBe(0);
  });

  it("ignores missing files when undoing generated writes", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "task-undo-"));
    const filePath = join(tempDir, "MySth", "MySth.stories.tsx");

    try {
      const result = await runUndo(writeFile(filePath, "story contents"));

      expect(result.undoCount).toBe(1);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
