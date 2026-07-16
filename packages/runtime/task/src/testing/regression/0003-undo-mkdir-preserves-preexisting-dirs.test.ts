/**
 * Regression: `runUndo` on a task tree containing `mkdir` must never delete
 * a directory the task did not create (or contents it did not write).
 *
 * Before the fix, `MakeDir`'s default undo was a recursive `DeleteDirectory`.
 * Because undo collection replays the tree against a virtual filesystem, the
 * mkdir undo is collected even when the directory pre-existed on disk — so
 * `pragma setup mcp --undo` recursively deleted the user's project root, and
 * `setup completions --undo` deleted the shared bash-completions directory
 * along with other tools' files.
 *
 * The default undo is now `DeleteDirectory` with `onlyIfEmpty`: it rmdirs the
 * path non-recursively at undo time and silently skips missing or non-empty
 * directories, so it can only remove what the task's own file undos emptied.
 */

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sequence_ } from "../../lib/combinators.js";
import { runTask } from "../../lib/interpreter.js";
import { mkdir, writeFile } from "../../lib/primitives.js";
import { runUndo } from "../../lib/undo-interpreter.js";

describe("regression 0003 — undo after mkdir preserves pre-existing directories", () => {
  let root: string;

  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), "task-regression-0003-"));
  });

  afterAll(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("does not delete a pre-existing directory or its unrelated contents", async () => {
    const project = join(root, "project");
    mkdirSync(project);
    writeFileSync(join(project, "precious.txt"), "user data");

    // Mirrors writeMcpConfig's "config file missing" branch: ensure the
    // directory exists, then write a new file into it.
    const task = sequence_([
      mkdir(project),
      writeFile(join(project, ".generated.json"), "{}"),
    ]);

    await runTask(task);
    expect(existsSync(join(project, ".generated.json"))).toBe(true);

    await runUndo(task);

    expect(existsSync(join(project, ".generated.json"))).toBe(false);
    expect(existsSync(join(project, "precious.txt"))).toBe(true);
    expect(existsSync(project)).toBe(true);
  });

  it("does not delete a shared directory holding other files", async () => {
    const completions = join(root, "completions");
    mkdirSync(completions);
    writeFileSync(join(completions, "othertool"), "someone else's script");

    const task = sequence_([
      mkdir(completions),
      writeFile(join(completions, "pragma"), "our script"),
    ]);

    await runTask(task);
    await runUndo(task);

    expect(existsSync(join(completions, "pragma"))).toBe(false);
    expect(existsSync(join(completions, "othertool"))).toBe(true);
    expect(existsSync(completions)).toBe(true);
  });

  it("still removes a directory the task created once its contents are undone", async () => {
    const fresh = join(root, "fresh");

    const task = sequence_([
      mkdir(fresh),
      writeFile(join(fresh, "generated.txt"), "generated"),
    ]);

    await runTask(task);
    expect(existsSync(fresh)).toBe(true);

    await runUndo(task);

    expect(existsSync(fresh)).toBe(false);
  });

  it("leaves a created directory in place when the user added files to it", async () => {
    const created = join(root, "created-then-used");

    const task = sequence_([
      mkdir(created),
      writeFile(join(created, "generated.txt"), "generated"),
    ]);

    await runTask(task);
    writeFileSync(join(created, "user-added.txt"), "added after generation");

    await runUndo(task);

    expect(existsSync(join(created, "generated.txt"))).toBe(false);
    expect(existsSync(join(created, "user-added.txt"))).toBe(true);
    expect(existsSync(created)).toBe(true);
  });
});
