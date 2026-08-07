import {
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { parallel, race } from "./combinators.js";
import { raceEffect } from "./effect.js";
import { TaskExecutionError } from "./errors.js";
import { runPreview } from "./preview-interpreter.js";
import {
  appendFile,
  copyDirectory,
  copyFile,
  deleteDirectory,
  deleteFile,
  exec,
  exists,
  getContext,
  glob,
  info,
  mkdir,
  promptConfirm,
  promptText,
  readFile,
  setContext,
  succeed,
  symlink,
  transformFile,
  writeFile,
} from "./primitives.js";
import { $, effect, fail, gen, recover } from "./task.js";
import type { Effect, ExecResult } from "./types.js";

/** Every temp dir this file mints, removed in one afterAll. */
const roots: string[] = [];
afterAll(() => {
  for (const dir of roots) rmSync(dir, { recursive: true, force: true });
});

/** A fresh tracked temp dir. */
function tempRoot(): string {
  const dir = mkdtempSync(join(tmpdir(), "task-preview-"));
  roots.push(dir);
  return dir;
}

/** One walked entry: what it is, its bytes (or link target), and its mtime. */
interface TreeEntry {
  readonly kind: "file" | "dir" | "link";
  readonly content?: string;
  readonly mtimeMs: number;
}

/**
 * A byte-level snapshot of a directory tree: kind + content + mtime for every
 * entry, keyed by relative path. Two identical snapshots prove the previewer
 * neither wrote, deleted, nor touched anything.
 */
function snapshotTree(root: string, prefix = ""): Record<string, TreeEntry> {
  const entries: Record<string, TreeEntry> = {};
  for (const name of readdirSync(join(root, prefix)).sort()) {
    const rel = prefix ? `${prefix}/${name}` : name;
    const stats = lstatSync(join(root, rel));
    if (stats.isSymbolicLink()) {
      entries[rel] = {
        kind: "link",
        content: readlinkSync(join(root, rel)),
        mtimeMs: stats.mtimeMs,
      };
    } else if (stats.isDirectory()) {
      entries[rel] = { kind: "dir", mtimeMs: stats.mtimeMs };
      Object.assign(entries, snapshotTree(root, rel));
    } else {
      entries[rel] = {
        kind: "file",
        content: readFileSync(join(root, rel), "utf-8"),
        mtimeMs: stats.mtimeMs,
      };
    }
  }
  return entries;
}

// =============================================================================
// The headline: the previewer cannot write
// =============================================================================

describe("runPreview — the previewer cannot write", () => {
  it("performs every write-like tag + Exec against a tmpdir and leaves it byte-identical", async () => {
    const root = tempRoot();
    writeFileSync(join(root, "seed.txt"), "alpha\n");
    writeFileSync(join(root, "victim.txt"), "doomed\n");
    writeFileSync(join(root, "link-target.txt"), "pointed-at\n");
    mkdirSync(join(root, "dir"));
    writeFileSync(join(root, "dir", "nested.txt"), "nested\n");
    mkdirSync(join(root, "stale"));
    writeFileSync(join(root, "stale", "old.txt"), "old\n");

    const before = snapshotTree(root);

    const task = gen(function* () {
      yield* $(writeFile("out.txt", "created\n"));
      yield* $(appendFile("seed.txt", "more\n"));
      yield* $(transformFile("seed.txt", (s) => s.toUpperCase()));
      yield* $(copyFile("seed.txt", "copy.txt"));
      yield* $(copyDirectory("dir", "dir2"));
      yield* $(deleteFile("victim.txt"));
      yield* $(deleteDirectory("stale"));
      yield* $(mkdir("made/deep"));
      yield* $(symlink("link-target.txt", "the-link"));
      const result = yield* $(exec("touch", ["exec-side-effect"]));
      return result;
    });

    const { value, effects } = await runPreview(task, { cwd: root });

    // The disk is untouched, to the byte and to the mtime.
    expect(snapshotTree(root)).toEqual(before);
    // Exec was mocked, never spawned: its side effect does not exist and its
    // result is the documented mock.
    expect((value as ExecResult).exitCode).toBe(0);
    expect((value as ExecResult).stdout).toBe("");
    expect(effects.map((e) => e._tag)).toEqual([
      "WriteFile",
      "AppendFile",
      "TransformFile",
      "CopyFile",
      "CopyDirectory",
      "DeleteFile",
      "DeleteDirectory",
      "MakeDir",
      "Symlink",
      "Exec",
    ]);
  });
});

// =============================================================================
// Real reads
// =============================================================================

describe("runPreview — reads are real", () => {
  it("ReadFile returns the file's actual bytes", async () => {
    const root = tempRoot();
    writeFileSync(join(root, "real.txt"), "real content");
    const { value } = await runPreview(readFile(join(root, "real.txt")));
    expect(value).toBe("real content");
  });

  it("Exists answers false for a missing path (the mock's unconditional true is gone)", async () => {
    const root = tempRoot();
    const { value } = await runPreview(exists(join(root, "nope.txt")));
    expect(value).toBe(false);
  });

  it("Glob lists real matches", async () => {
    const root = tempRoot();
    writeFileSync(join(root, "a.txt"), "a");
    writeFileSync(join(root, "b.md"), "b");
    const { value } = await runPreview(glob("*.txt", root));
    expect(value).toEqual(["a.txt"]);
  });

  it("a missing ReadFile fails the preview exactly as the run would (FILE_NOT_FOUND)", async () => {
    const root = tempRoot();
    await expect(
      runPreview(readFile(join(root, "absent.txt"))),
    ).rejects.toMatchObject({ taskError: { code: "FILE_NOT_FOUND" } });
  });

  it("a real read failure routes through the recovery channel", async () => {
    const root = tempRoot();
    const recovered = recover(readFile(join(root, "absent.txt")), (error) =>
      succeed(`recovered:${error.code}`),
    );
    const { value } = await runPreview(recovered);
    expect(value).toBe("recovered:FILE_NOT_FOUND");
  });
});

// =============================================================================
// The write overlay
// =============================================================================

describe("runPreview — the write overlay", () => {
  it("a planned write reads back and exists, without touching disk", async () => {
    const root = tempRoot();
    const target = join(root, "planned.txt");
    const task = gen(function* () {
      yield* $(writeFile(target, "planned"));
      const present = yield* $(exists(target));
      const content = yield* $(readFile(target));
      return { present, content };
    });
    const { value } = await runPreview(task);
    expect(value).toEqual({ present: true, content: "planned" });
    expect(readdirSync(root)).toEqual([]);
  });

  it("a planned directory exists", async () => {
    const root = tempRoot();
    const task = gen(function* () {
      yield* $(mkdir(join(root, "made")));
      return yield* $(exists(join(root, "made")));
    });
    expect((await runPreview(task)).value).toBe(true);
  });

  it("append stacks on a planned write", async () => {
    const root = tempRoot();
    const target = join(root, "a.txt");
    const task = gen(function* () {
      yield* $(writeFile(target, "one"));
      yield* $(appendFile(target, "+two"));
      return yield* $(readFile(target));
    });
    expect((await runPreview(task)).value).toBe("one+two");
  });

  it("append reads the real file's content, leaving the file unchanged", async () => {
    const root = tempRoot();
    const target = join(root, "real.txt");
    writeFileSync(target, "disk");
    const task = gen(function* () {
      yield* $(appendFile(target, "+planned"));
      return yield* $(readFile(target));
    });
    expect((await runPreview(task)).value).toBe("disk+planned");
    expect(readFileSync(target, "utf-8")).toBe("disk");
  });

  it("append to a missing file starts from empty (the real append creates it)", async () => {
    const root = tempRoot();
    const target = join(root, "new.txt");
    const task = gen(function* () {
      yield* $(appendFile(target, "fresh"));
      return yield* $(readFile(target));
    });
    expect((await runPreview(task)).value).toBe("fresh");
  });

  it("a non-ENOENT read failure surfaces as the run's own error (EISDIR → INTERNAL)", async () => {
    const root = tempRoot();
    mkdirSync(join(root, "adir"));
    await expect(
      runPreview(appendFile(join(root, "adir"), "x")),
    ).rejects.toMatchObject({ taskError: { code: "INTERNAL" } });
  });

  it("transform runs the pure transform against real content", async () => {
    const root = tempRoot();
    const target = join(root, "t.txt");
    writeFileSync(target, "abc");
    const task = gen(function* () {
      yield* $(transformFile(target, (s) => s.toUpperCase()));
      return yield* $(readFile(target));
    });
    expect((await runPreview(task)).value).toBe("ABC");
    expect(readFileSync(target, "utf-8")).toBe("abc");
  });

  it("transform on a missing file fails FILE_NOT_FOUND, as the run would", async () => {
    const root = tempRoot();
    await expect(
      runPreview(transformFile(join(root, "gone.txt"), (s) => s)),
    ).rejects.toMatchObject({ taskError: { code: "FILE_NOT_FOUND" } });
  });

  it("a throwing transform fails the preview as it would the run", async () => {
    const root = tempRoot();
    writeFileSync(join(root, "t.txt"), "x");
    await expect(
      runPreview(
        transformFile(join(root, "t.txt"), () => {
          throw new Error("transform bug");
        }),
      ),
    ).rejects.toMatchObject({
      taskError: { code: "INTERNAL", message: "transform bug" },
    });
  });

  it("copy sources from the overlay, and a missing source fails FILE_NOT_FOUND", async () => {
    const root = tempRoot();
    const task = gen(function* () {
      yield* $(writeFile(join(root, "src.txt"), "payload"));
      yield* $(copyFile(join(root, "src.txt"), join(root, "dst.txt")));
      return yield* $(readFile(join(root, "dst.txt")));
    });
    expect((await runPreview(task)).value).toBe("payload");

    await expect(
      runPreview(copyFile(join(root, "missing.txt"), join(root, "d.txt"))),
    ).rejects.toMatchObject({ taskError: { code: "FILE_NOT_FOUND" } });
  });

  it("copyDirectory of a planned FILE source copies the file (fs.cp semantics)", async () => {
    const root = tempRoot();
    const task = gen(function* () {
      yield* $(writeFile(join(root, "one.txt"), "1"));
      yield* $(copyDirectory(join(root, "one.txt"), join(root, "two.txt")));
      return yield* $(readFile(join(root, "two.txt")));
    });
    expect((await runPreview(task)).value).toBe("1");
  });

  it("copyDirectory of a real directory marks the destination present; a missing one fails", async () => {
    const root = tempRoot();
    mkdirSync(join(root, "src"));
    const task = gen(function* () {
      yield* $(copyDirectory(join(root, "src"), join(root, "dst")));
      return yield* $(exists(join(root, "dst")));
    });
    expect((await runPreview(task)).value).toBe(true);

    await expect(
      runPreview(copyDirectory(join(root, "ghost"), join(root, "dst"))),
    ).rejects.toMatchObject({ taskError: { code: "FILE_NOT_FOUND" } });
  });

  it("copyDirectory of a REAL file source copies the file, not a directory", async () => {
    // `fs.cp` copies a file source as a file whether or not the plan wrote it.
    // Modelling a real file as a planned DIRECTORY made the read below fail
    // where the run succeeds — the one case the planned-file branch missed.
    const root = tempRoot();
    writeFileSync(join(root, "on-disk.txt"), "from disk");
    const task = gen(function* () {
      yield* $(
        copyDirectory(join(root, "on-disk.txt"), join(root, "copy.txt")),
      );
      return yield* $(readFile(join(root, "copy.txt")));
    });
    expect((await runPreview(task)).value).toBe("from disk");
  });

  it("copyDirectory of a PLANNED directory source stays a directory", async () => {
    // The plan's own directory is not on disk, so it must not be re-read to
    // classify it — the source-kind question is already answered.
    const root = tempRoot();
    const task = gen(function* () {
      yield* $(mkdir(join(root, "planned")));
      yield* $(copyDirectory(join(root, "planned"), join(root, "dst")));
      return yield* $(exists(join(root, "dst")));
    });
    expect((await runPreview(task)).value).toBe(true);
  });

  it("a planned delete tombstones the file for reads and exists", async () => {
    const root = tempRoot();
    const target = join(root, "victim.txt");
    writeFileSync(target, "here");
    const task = gen(function* () {
      yield* $(deleteFile(target));
      const present = yield* $(exists(target));
      return present;
    });
    expect((await runPreview(task)).value).toBe(false);
    expect(readFileSync(target, "utf-8")).toBe("here");

    await expect(
      runPreview(
        gen(function* () {
          yield* $(deleteFile(target));
          return yield* $(readFile(target));
        }),
      ),
    ).rejects.toMatchObject({ taskError: { code: "FILE_NOT_FOUND" } });
  });

  it("a deleted directory tombstones its subtree; a later write resurrects only its own path", async () => {
    const root = tempRoot();
    mkdirSync(join(root, "d"));
    writeFileSync(join(root, "d", "kept.txt"), "kept");
    const task = gen(function* () {
      yield* $(mkdir(join(root, "d", "sub")));
      yield* $(deleteDirectory(join(root, "d")));
      const goneDir = yield* $(exists(join(root, "d")));
      const goneFile = yield* $(exists(join(root, "d", "kept.txt")));
      const goneSub = yield* $(exists(join(root, "d", "sub")));
      yield* $(writeFile(join(root, "d", "new.txt"), "reborn"));
      const rebornFile = yield* $(exists(join(root, "d", "new.txt")));
      const rebornDir = yield* $(exists(join(root, "d")));
      const stillGone = yield* $(exists(join(root, "d", "kept.txt")));
      return { goneDir, goneFile, goneSub, rebornFile, rebornDir, stillGone };
    });
    expect((await runPreview(task)).value).toEqual({
      goneDir: false,
      goneFile: false,
      goneSub: false,
      rebornFile: true,
      rebornDir: true,
      stillGone: false,
    });
  });

  it("a deleted directory removes the planned files and dirs beneath it", async () => {
    const root = tempRoot();
    const task = gen(function* () {
      yield* $(writeFile(join(root, "d", "x.txt"), "x"));
      yield* $(deleteDirectory(join(root, "d")));
      return yield* $(exists(join(root, "d", "x.txt")));
    });
    expect((await runPreview(task)).value).toBe(false);
  });

  it("deleteDirectory on a planned file removes it (rm -rf force semantics)", async () => {
    const root = tempRoot();
    const target = join(root, "flat.txt");
    const task = gen(function* () {
      yield* $(writeFile(target, "x"));
      yield* $(deleteDirectory(target));
      return yield* $(exists(target));
    });
    expect((await runPreview(task)).value).toBe(false);
  });

  it("append after a planned delete starts from empty", async () => {
    const root = tempRoot();
    const target = join(root, "f.txt");
    writeFileSync(target, "disk");
    const task = gen(function* () {
      yield* $(deleteFile(target));
      yield* $(appendFile(target, "reborn"));
      return yield* $(readFile(target));
    });
    expect((await runPreview(task)).value).toBe("reborn");
  });

  it("deleteDirectory onlyIfEmpty is recorded with no overlay change", async () => {
    const root = tempRoot();
    mkdirSync(join(root, "d"));
    const task = gen(function* () {
      yield* $(deleteDirectory(join(root, "d"), { onlyIfEmpty: true }));
      return yield* $(exists(join(root, "d")));
    });
    const { value, effects } = await runPreview(task);
    expect(value).toBe(true);
    expect(effects[0]?._tag).toBe("DeleteDirectory");
  });
});

// =============================================================================
// Glob against the overlay
// =============================================================================

describe("runPreview — Glob through the overlay", () => {
  it("merges planned files into the real matches and drops deleted ones", async () => {
    const root = tempRoot();
    writeFileSync(join(root, "real.txt"), "r");
    writeFileSync(join(root, "doomed.txt"), "d");
    const task = gen(function* () {
      yield* $(writeFile(join(root, "planned.txt"), "p"));
      yield* $(deleteFile(join(root, "doomed.txt")));
      return yield* $(glob("*.txt", root));
    });
    expect((await runPreview(task)).value).toEqual(["real.txt", "planned.txt"]);
  });

  it("skips planned files outside the root, off the pattern, or already listed", async () => {
    const root = tempRoot();
    const elsewhere = tempRoot();
    writeFileSync(join(root, "real.txt"), "r");
    const task = gen(function* () {
      // Outside the glob's root entirely — never a candidate.
      yield* $(writeFile(join(elsewhere, "stray.txt"), "s"));
      // Under the root, but the pattern does not match it.
      yield* $(writeFile(join(root, "notes.md"), "n"));
      // Under the root and matching, but the real scan already listed it —
      // a planned overwrite must not duplicate the entry.
      yield* $(writeFile(join(root, "real.txt"), "rewritten"));
      return yield* $(glob("*.txt", root));
    });
    expect((await runPreview(task)).value).toEqual(["real.txt"]);
  });

  it("a glob over a directory the plan created swallows the real ENOENT", async () => {
    const root = tempRoot();
    const ghost = join(root, "ghost");
    const task = gen(function* () {
      yield* $(mkdir(ghost));
      yield* $(writeFile(join(ghost, "a.txt"), "a"));
      return yield* $(glob("*.txt", ghost));
    });
    expect((await runPreview(task)).value).toEqual(["a.txt"]);
  });

  it("a glob over a missing directory fails as the run would", async () => {
    const root = tempRoot();
    await expect(
      runPreview(glob("*.txt", join(root, "nowhere"))),
    ).rejects.toMatchObject({ taskError: { code: "FILE_NOT_FOUND" } });
  });

  it("a glob over a deleted directory fails as the run would", async () => {
    const root = tempRoot();
    mkdirSync(join(root, "d"));
    await expect(
      runPreview(
        gen(function* () {
          yield* $(deleteDirectory(join(root, "d")));
          return yield* $(glob("*", join(root, "d")));
        }),
      ),
    ).rejects.toMatchObject({ taskError: { code: "FILE_NOT_FOUND" } });
  });

  it("a non-ENOENT glob failure propagates (glob root is a file)", async () => {
    const root = tempRoot();
    writeFileSync(join(root, "flat.txt"), "flat");
    await expect(
      runPreview(glob("*", join(root, "flat.txt"))),
    ).rejects.toMatchObject({ taskError: { code: "INTERNAL" } });
  });
});

// =============================================================================
// MakeDir and Symlink failure parity
// =============================================================================

describe("runPreview — MakeDir and Symlink fail as the run would", () => {
  it("recursive mkdir never fails on an existing path", async () => {
    const root = tempRoot();
    const { value } = await runPreview(
      gen(function* () {
        yield* $(mkdir(root));
        return "ok";
      }),
    );
    expect(value).toBe("ok");
  });

  it("non-recursive mkdir on an existing path fails EEXIST", async () => {
    const root = tempRoot();
    await expect(runPreview(mkdir(root, false))).rejects.toMatchObject({
      taskError: { code: "INTERNAL" },
    });
    await expect(runPreview(mkdir(root, false))).rejects.toThrow(/EEXIST/);
  });

  it("non-recursive mkdir on a planned path fails EEXIST", async () => {
    const root = tempRoot();
    const dir = join(root, "planned");
    await expect(
      runPreview(
        gen(function* () {
          yield* $(mkdir(dir));
          yield* $(mkdir(dir, false));
        }),
      ),
    ).rejects.toThrow(/EEXIST/);
  });

  it("non-recursive mkdir with a missing parent fails ENOENT", async () => {
    const root = tempRoot();
    await expect(
      runPreview(mkdir(join(root, "no", "parent"), false)),
    ).rejects.toMatchObject({ taskError: { code: "FILE_NOT_FOUND" } });
  });

  it("non-recursive mkdir with a present parent succeeds", async () => {
    const root = tempRoot();
    const task = gen(function* () {
      yield* $(mkdir(join(root, "child"), false));
      return yield* $(exists(join(root, "child")));
    });
    expect((await runPreview(task)).value).toBe(true);
  });

  it("a symlink reads back with its target's current content", async () => {
    const root = tempRoot();
    writeFileSync(join(root, "target.txt"), "pointed-at");
    const task = gen(function* () {
      yield* $(symlink("target.txt", join(root, "link")));
      return yield* $(readFile(join(root, "link")));
    });
    expect((await runPreview(task)).value).toBe("pointed-at");
  });

  it("a symlink to a planned absolute target reads back with planned content", async () => {
    const root = tempRoot();
    const target = join(root, "planned.txt");
    const task = gen(function* () {
      yield* $(writeFile(target, "virtual"));
      yield* $(symlink(target, join(root, "link")));
      return yield* $(readFile(join(root, "link")));
    });
    expect((await runPreview(task)).value).toBe("virtual");
  });

  it("a symlink to a real DIRECTORY previews as a directory, not a failure", async () => {
    // The real `symlink` never reads its target, so linking a directory (what
    // `setup` does for every skills root) must preview as cleanly as it runs.
    const root = tempRoot();
    mkdirSync(join(root, "skills"));
    const task = gen(function* () {
      yield* $(symlink(join(root, "skills"), join(root, "link")));
      return yield* $(exists(join(root, "link")));
    });
    expect((await runPreview(task)).value).toBe(true);
  });

  it("a symlink to a PLANNED directory previews as a directory", async () => {
    const root = tempRoot();
    const task = gen(function* () {
      yield* $(mkdir(join(root, "made")));
      yield* $(symlink(join(root, "made"), join(root, "link")));
      return yield* $(exists(join(root, "link")));
    });
    expect((await runPreview(task)).value).toBe(true);
  });

  it("a symlink whose target read fails for any other reason reads back empty", async () => {
    // A path UNDER a regular file reads ENOTDIR — neither content nor a
    // directory. The link is still planned; only its modelled content is empty.
    const root = tempRoot();
    writeFileSync(join(root, "file.txt"), "x");
    const task = gen(function* () {
      yield* $(symlink(join(root, "file.txt", "under"), join(root, "link")));
      return yield* $(readFile(join(root, "link")));
    });
    expect((await runPreview(task)).value).toBe("");
  });

  it("a symlink to an unreadable target reads back empty (documented limit)", async () => {
    const root = tempRoot();
    const task = gen(function* () {
      yield* $(symlink(join(root, "nothing"), join(root, "link")));
      return yield* $(readFile(join(root, "link")));
    });
    expect((await runPreview(task)).value).toBe("");
  });

  it("a symlink onto an existing path fails EEXIST, as the run would", async () => {
    const root = tempRoot();
    writeFileSync(join(root, "occupied"), "x");
    await expect(
      runPreview(symlink("anywhere", join(root, "occupied"))),
    ).rejects.toThrow(/EEXIST/);
  });
});

// =============================================================================
// Exec, Prompt, Log, Context
// =============================================================================

describe("runPreview — mocked and pass-through effects", () => {
  it("Exec is never spawned and answers the documented mock (ruling R2)", async () => {
    const { value } = await runPreview(exec("definitely-not-a-command", []));
    expect(value).toEqual({ stdout: "", stderr: "", exitCode: 0 });
  });

  it("prompts auto-answer with their defaults", async () => {
    const task = gen(function* () {
      const name = yield* $(promptText("name", "Name?", "fallback"));
      const sure = yield* $(promptConfirm("sure", "Sure?", true));
      return { name, sure };
    });
    expect((await runPreview(task)).value).toEqual({
      name: "fallback",
      sure: true,
    });
  });

  it("Log is recorded and forwarded to onLog, and silent without one", async () => {
    const seen: string[] = [];
    const { effects } = await runPreview(info("hello"), {
      onLog: (level, message) => seen.push(`${level}:${message}`),
    });
    expect(seen).toEqual(["info:hello"]);
    expect(effects.map((e) => e._tag)).toEqual(["Log"]);

    // Without onLog: recorded, nothing thrown, nothing printed.
    expect((await runPreview(info("quiet"))).effects).toHaveLength(1);
  });

  it("context reads and writes are real, against the per-call map", async () => {
    const task = gen(function* () {
      yield* $(setContext("k", 7));
      return yield* $(getContext<number>("k"));
    });
    expect((await runPreview(task)).value).toBe(7);

    const seeded = new Map<string, unknown>([["k", "given"]]);
    expect((await runPreview(getContext("k"), { context: seeded })).value).toBe(
      "given",
    );
  });
});

// =============================================================================
// onEffectStart / onEffectComplete / authored paths
// =============================================================================

describe("runPreview — effect callbacks and authored paths", () => {
  it("honors onEffectStart, so a stamping mutation lands in the recorded plan AND the overlay", async () => {
    const root = tempRoot();
    const target = join(root, "stamped.txt");
    // The summon pattern: onEffectStart rewrites a write effect's content.
    const stamp = (effect: Effect): void => {
      if (effect._tag === "WriteFile") {
        (effect as { content: string }).content =
          `/* stamp */\n${effect.content}`;
      }
    };
    const task = gen(function* () {
      yield* $(writeFile(target, "body"));
      return yield* $(readFile(target));
    });
    const { value, effects } = await runPreview(task, {
      onEffectStart: stamp,
    });
    expect(value).toBe("/* stamp */\nbody");
    const write = effects[0] as Effect & { _tag: "WriteFile" };
    expect(write.content).toBe("/* stamp */\nbody");
  });

  it("calls onEffectComplete per effect with a duration", async () => {
    const root = tempRoot();
    const done: Array<[string, number]> = [];
    await runPreview(writeFile(join(root, "x"), "x"), {
      onEffectComplete: (effect, duration) =>
        done.push([effect._tag, duration]),
    });
    expect(done).toHaveLength(1);
    expect(done[0]?.[0]).toBe("WriteFile");
    expect(done[0]?.[1]).toBeGreaterThanOrEqual(0);
  });

  it("records authored (unresolved) paths while resolving them against cwd", async () => {
    const root = tempRoot();
    writeFileSync(join(root, "seed.txt"), "seeded");
    const task = gen(function* () {
      const content = yield* $(readFile("seed.txt"));
      yield* $(writeFile("out.txt", content));
      return yield* $(exists("out.txt"));
    });
    const { value, effects } = await runPreview(task, { cwd: root });
    expect(value).toBe(true);
    // The plan shows what was authored, not where it resolved.
    expect(
      effects.map((e) => ("path" in e ? e.path : "")).filter(Boolean),
    ).toEqual(["seed.txt", "out.txt", "out.txt"]);
  });
});

// =============================================================================
// Parallel and Race
// =============================================================================

describe("runPreview — Parallel and Race", () => {
  it("drives Parallel children sequentially against the shared overlay", async () => {
    const root = tempRoot();
    const target = join(root, "p.txt");
    const task = parallel([writeFile(target, "x"), exists(target)]);
    const { value, effects } = await runPreview(task);
    expect(value).toEqual([undefined, true]);
    expect(effects.map((e) => e._tag)).toEqual(["WriteFile", "Exists"]);
  });

  it("propagates a Parallel child's failure", async () => {
    const root = tempRoot();
    await expect(
      runPreview(parallel([readFile(join(root, "absent.txt")), succeed(1)])),
    ).rejects.toMatchObject({ taskError: { code: "FILE_NOT_FOUND" } });
  });

  it("drives only the first Race child (deterministic preview)", async () => {
    const root = tempRoot();
    const task = race([succeed("first"), writeFile(join(root, "never"), "x")]);
    const { value, effects } = await runPreview(task);
    expect(value).toBe("first");
    expect(effects).toEqual([]);
  });

  it("an empty raw Race effect resolves undefined, matching dryRun", async () => {
    // The `race` combinator itself rejects an empty array before any
    // interpreter runs; the raw effect is the interpreter-level case.
    const { value } = await runPreview(effect(raceEffect([])));
    expect(value).toBeUndefined();
  });

  it("reports the structural effects to the callbacks without recording them", async () => {
    const started: string[] = [];
    const completed: string[] = [];
    const { effects } = await runPreview(
      race([parallel([succeed(1)]), succeed(2)]),
      {
        onEffectStart: (effect) => started.push(effect._tag),
        onEffectComplete: (effect) => completed.push(effect._tag),
      },
    );
    expect(started).toEqual(["Race", "Parallel"]);
    expect(completed).toEqual(["Parallel", "Race"]);
    expect(effects).toEqual([]);
  });
});

// =============================================================================
// Failure shape
// =============================================================================

describe("runPreview — throws like runTask", () => {
  it("an unrecovered Fail escapes as TaskExecutionError", async () => {
    await expect(
      runPreview(fail({ code: "BOOM", message: "no" })),
    ).rejects.toBeInstanceOf(TaskExecutionError);
  });

  it("a recovered Fail resolves through the handler", async () => {
    const { value } = await runPreview(
      recover(fail({ code: "BOOM", message: "no" }), (error) =>
        succeed(error.code),
      ),
    );
    expect(value).toBe("BOOM");
  });
});
