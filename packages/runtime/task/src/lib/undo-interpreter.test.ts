import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ifElseM, parallel, sequence_, when } from "./combinators.js";
import { dryRun } from "./dry-run.js";
import { TaskExecutionError } from "./errors.js";
import { runTask } from "./interpreter.js";
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
  transformFile,
  writeFile,
} from "./primitives.js";
import { $, effect, fail, flatMap, gen, map, pure, recover } from "./task.js";
import type { Task } from "./types.js";
import { collectUndos } from "./undo.js";
import {
  hostExistsResolver,
  runCollectedUndos,
  runUndo,
} from "./undo-interpreter.js";

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

// =============================================================================
// Lazy node handling (FlatMap / Recover)
// =============================================================================

describe("collectUndos - lazy node handling", () => {
  const boom = (): never => {
    throw new Error("raw");
  };

  it("collects undos through flatMap and recover nodes", () => {
    const undoTask = pure<void>(undefined);
    const writeWithUndo = effect<void>({
      _tag: "WriteFile",
      path: "f",
      content: "c",
      undo: undoTask,
    });
    const undos = collectUndos(
      flatMap(writeWithUndo, () => recover(pure(1), () => pure(0))),
    );
    expect(undos).toHaveLength(1);
    expect(undos[0]).toBe(undoTask);
  });

  it("recovers from a failed task while walking", () => {
    expect(
      collectUndos(
        recover(fail<number>({ code: "E", message: "m" }), () => pure(0)),
      ),
    ).toEqual([]);
  });

  it("rethrows a non-task error raised inside a recovered task", () => {
    expect(() =>
      collectUndos(recover(map(pure(1), boom), () => pure(0))),
    ).toThrow("raw");
  });

  it("walks flatMap/recover inside Parallel children", () => {
    const undos = collectUndos(
      parallel([
        flatMap(pure(1), (x) => pure(x + 1)),
        recover(fail<number>({ code: "E", message: "m" }), () => pure(0)),
        recover(pure(5), () => pure(0)),
      ]),
    );
    expect(undos).toEqual([]);
  });

  it("rethrows a non-task error from a Parallel child", () => {
    expect(() =>
      collectUndos(parallel([recover(map(pure(1), boom), () => pure(0))])),
    ).toThrow("raw");
  });
});

// =============================================================================
// collectUndos - Parallel result value is readable by a continuation
// =============================================================================

describe("collectUndos - host-backed Exists resolution", () => {
  // The regression this pins: a task that branches on pre-existing host state
  // (append-if-exists / create-if-missing) must collect the undo of the branch
  // the forward run actually took. Without a resolver every Exists is false,
  // so collection always picks the create branch — whose default undo deletes
  // the pre-existing file.
  const appendOrCreate = (indexPath: string, line: string): Task<void> =>
    ifElseM(
      exists(indexPath),
      appendFile(indexPath, line, true, { undo: info("remove appended line") }),
      writeFile(indexPath, line),
    );

  it("collects the append branch's undo when the resolver reports the path", () => {
    const undos = collectUndos(appendOrCreate("/idx.ts", "line\n"), {
      resolveExists: (p) => p === "/idx.ts",
    });

    expect(undos).toHaveLength(1);
    const effects = dryRun(undos[0]).effects;
    expect(effects[0]._tag).toBe("Log");
  });

  it("collects the create branch's undo when the resolver denies the path", () => {
    const undos = collectUndos(appendOrCreate("/idx.ts", "line\n"), {
      resolveExists: () => false,
    });

    expect(undos).toHaveLength(1);
    const effects = dryRun(undos[0]).effects;
    expect(effects[0]._tag).toBe("DeleteFile");
  });

  it("keeps the legacy blank-filesystem behavior without a resolver", () => {
    const undos = collectUndos(appendOrCreate("/idx.ts", "line\n"));

    expect(undos).toHaveLength(1);
    const effects = dryRun(undos[0]).effects;
    expect(effects[0]._tag).toBe("DeleteFile");
  });

  it("composes the resolver with the walk's own virtual writes", () => {
    // The walk itself creates /a; a denying resolver must not hide it.
    const task = gen(function* () {
      yield* $(writeFile("/a.txt", "a"));
      const found = yield* $(exists("/a.txt"));
      if (found) {
        yield* $(writeFile("/b.txt", "b"));
      }
    });
    const undos = collectUndos(task, { resolveExists: () => false });

    expect(undos).toHaveLength(2);
  });
});

describe("collectUndos - fail-backtracking", () => {
  // The run being undone succeeded, so collection must not end in a Fail: a
  // forward-only guard (fail-if-present on a file the run itself created)
  // reads as failing under host resolution, and the walk must flip that
  // Exists decision and continue instead of aborting.
  it("flips an Exists decision that steers into a guard failure", () => {
    const task = ifElseM(
      exists("/page.tsx"),
      fail({ code: "PAGE_EXISTS", message: "already there" }),
      writeFile("/page.tsx", "content"),
    );

    const undos = collectUndos(task, { resolveExists: () => true });

    expect(undos).toHaveLength(1);
    expect(dryRun(undos[0]).effects[0]._tag).toBe("DeleteFile");
  });

  it("flips only the failing decision in a route-style guard chain", () => {
    // Domain must exist (true is fine), page must not (true fails): only the
    // page decision gets flipped.
    const task = flatMap(exists("/routes.ts"), (domainPresent) =>
      !domainPresent
        ? fail({ code: "DOMAIN_MISSING", message: "no domain" })
        : flatMap(exists("/page.tsx"), (pagePresent) =>
            pagePresent
              ? fail({ code: "PAGE_EXISTS", message: "already there" })
              : sequence_([
                  writeFile("/page.tsx", "content"),
                  writeFile("/routes.ts", "routes", {
                    undo: info("un-insert route"),
                  }),
                ]),
          ),
    );

    const undos = collectUndos(task, { resolveExists: () => true });

    expect(undos).toHaveLength(2);
    expect(dryRun(undos[0]).effects[0]._tag).toBe("DeleteFile");
    expect(dryRun(undos[1]).effects[0]._tag).toBe("Log");
  });

  it("backtracks even without a resolver", () => {
    // Legacy preference is false everywhere; a fail on the false branch still
    // flips rather than aborting collection.
    const task = ifElseM(
      exists("/idx.ts"),
      appendFile("/idx.ts", "line\n", true, { undo: info("remove line") }),
      fail({ code: "MUST_EXIST", message: "missing" }),
    );

    const undos = collectUndos(task);

    expect(undos).toHaveLength(1);
    expect(dryRun(undos[0]).effects[0]._tag).toBe("Log");
  });

  /**
   * A re-interpretable chain of `count` free Exists decisions ending in an
   * unavoidable failure — every branch assignment fails.
   */
  const alwaysFailingTree = (count: number): Task<unknown> => {
    let tail: Task<unknown> = fail({ code: "ALWAYS", message: "every leaf" });
    for (let i = count - 1; i >= 0; i--) {
      const rest = tail;
      tail = flatMap(exists(`/decision-${i}`), () => rest);
    }
    return tail;
  };

  it("rethrows when no flip can avoid the failure", () => {
    // 2 decisions → 4 assignments, all failing: the search exhausts and the
    // genuine failure surfaces.
    expect(() =>
      collectUndos(alwaysFailingTree(2), { resolveExists: () => true }),
    ).toThrow(TaskExecutionError);
  });

  it("still rethrows an unconditional failure immediately", () => {
    expect(() =>
      collectUndos(fail({ code: "ERR", message: "boom" }), {
        resolveExists: () => true,
      }),
    ).toThrow(TaskExecutionError);
  });

  it("gives up after the walk-attempt cap on a pathological tree", () => {
    // 7 free decisions with every leaf failing = 128 assignments to exhaust,
    // above the 64-attempt cap.
    expect(() => collectUndos(alwaysFailingTree(7))).toThrow(
      /did not converge/,
    );
  });

  it("surfaces the failure for a non-re-interpretable gen() task", () => {
    // A gen() task closes over a single iterator: the backtracking re-walk
    // sees a spent generator that yields nothing, which must not read as a
    // successful, empty undo plan.
    const task = gen(function* () {
      yield* $(exists("/a"));
      yield* $(fail({ code: "GUARD", message: "boom" }));
    });

    expect(() => collectUndos(task, { resolveExists: () => true })).toThrow(
      TaskExecutionError,
    );
  });
});

describe("collectUndos - onForwardEffect", () => {
  it("reports the successful walk's leaf effects in forward order", () => {
    const seen: string[] = [];
    const task = sequence_([
      writeFile("/a.txt", "a"),
      exec("bun", ["install"]),
      info("done"),
    ]);

    collectUndos(task, { onForwardEffect: (e) => seen.push(e._tag) });

    expect(seen).toEqual(["WriteFile", "Exec", "Log"]);
  });

  it("never reports effects from failed backtracking attempts", () => {
    const seen: string[] = [];
    const task = ifElseM(
      exists("/page.tsx"),
      fail({ code: "PAGE_EXISTS", message: "already there" }),
      writeFile("/page.tsx", "content"),
    );

    collectUndos(task, {
      resolveExists: () => true,
      onForwardEffect: (e) => seen.push(e._tag),
    });

    // Only the surviving (flipped) walk's effects: the Exists probe and the
    // write — never the failed attempt's duplicates.
    expect(seen).toEqual(["Exists", "WriteFile"]);
  });
});

describe("runCollectedUndos", () => {
  it("executes a pre-collected plan in reverse without re-walking the task", async () => {
    const order: string[] = [];
    const onEffectComplete = (eff: import("./types.js").Effect) => {
      if (eff._tag === "WriteContext" && typeof eff.key === "string") {
        order.push(eff.key);
      }
    };
    const marker = (label: string) =>
      effect<void>({ _tag: "WriteContext", key: label, value: true });

    const task = sequence_([
      writeFile("/tmp/a.txt", "a", { undo: marker("a") }),
      writeFile("/tmp/b.txt", "b", { undo: marker("b") }),
    ]);
    const undos = collectUndos(task);

    const result = await runCollectedUndos(undos, {
      context: new Map(),
      onEffectComplete,
    });

    expect(result.undoCount).toBe(2);
    expect(order).toEqual(["b", "a"]);
    // The caller's forward-order array is not mutated by the LIFO execution.
    expect(dryRun(undos[0]).effects[0]).toMatchObject({ key: "a" });
  });

  it("returns undoCount 0 for an empty plan", async () => {
    const result = await runCollectedUndos([]);
    expect(result.undoCount).toBe(0);
  });
});

describe("hostExistsResolver", () => {
  it("resolves relative paths against the given cwd", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "task-undo-host-"));
    try {
      writeFileSync(join(tempDir, "present.txt"), "x");
      const resolve = hostExistsResolver(tempDir);

      expect(resolve("present.txt")).toBe(true);
      expect(resolve("missing.txt")).toBe(false);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("uses paths verbatim without a cwd", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "task-undo-host-"));
    try {
      const filePath = join(tempDir, "present.txt");
      writeFileSync(filePath, "x");
      const resolve = hostExistsResolver();

      expect(resolve(filePath)).toBe(true);
      expect(resolve(join(tempDir, "missing.txt"))).toBe(false);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

describe("runUndo - branch fidelity against the real filesystem", () => {
  it("un-appends from a pre-existing file instead of deleting it", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "task-undo-append-"));
    const indexPath = join(tempDir, "index.ts");
    const existing = 'export * from "./Old/index.js";\n';
    const appended = 'export * from "./New/index.js";\n';

    try {
      writeFileSync(indexPath, existing);

      const makeTask = (): Task<void> =>
        ifElseM(
          exists(indexPath),
          appendFile(indexPath, appended, true, {
            undo: transformFile(indexPath, (content) =>
              content.replace(appended, ""),
            ),
          }),
          writeFile(indexPath, appended),
        );

      await runTask(makeTask());
      expect(readFileSync(indexPath, "utf-8")).toBe(existing + appended);

      const result = await runUndo(makeTask());

      expect(result.undoCount).toBe(1);
      // The pre-existing file survives with only the appended line removed —
      // NOT deleted via the create branch's DeleteFile default undo.
      expect(readFileSync(indexPath, "utf-8")).toBe(existing);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

describe("collectUndos - Parallel result threaded to continuation", () => {
  it("threads each child's real mocked forward value to a continuation", () => {
    // The continuation must receive each child's real mocked forward value,
    // mirroring dryRun: a ReadFile mocks to its content string, a WriteFile to
    // undefined. Distinct, non-empty values are used deliberately so the
    // assertion fails against any placeholder shape (e.g. an array of []).
    let seenResults: unknown[] = [];
    const task = flatMap(
      parallel([readFile("/a.txt"), writeFile("/b.txt", "b")]),
      (results) => {
        seenResults = results as unknown[];
        return writeFile("/c.txt", "c");
      },
    );

    const undos = collectUndos(task);

    expect(seenResults).toEqual(["[mock content of /a.txt]", undefined]);
    // WriteFile /b and the continuation WriteFile /c are undoable; readFile is
    // not, so exactly two undos are collected.
    expect(undos).toHaveLength(2);
  });
});
