/**
 * The HONEST preview interpreter — `runPreview`.
 *
 * `dryRun` (the node-free mock in `dry-run.ts`) answers every effect with a
 * mock: reads return placeholder strings, `Exists` is unconditionally true, and
 * `onEffectStart` never fires. That is right for unit tests, and structurally
 * wrong for a user-facing `--dry-run`: a task whose real execution dies on its
 * first template read previews as a clean, full plan. `runPreview` is the
 * production preview: **reads are real, writes are recorded**, so a preview
 * succeeds exactly when the run would, fails exactly where and how the run
 * would fail, and leaves the disk untouched.
 *
 * The contract, per effect tag:
 *
 * - `ReadFile` / `Exists` / `Glob` — the closed allowlist of REAL reads.
 *   They consult the actual filesystem THROUGH the write overlay: a path the
 *   plan itself created reads back with its planned content, a path the plan
 *   deleted is gone (tombstoned), and everything else is answered by disk. A
 *   real read failure (ENOENT) routes through the same recovery channel as
 *   under `runTask`, so `recover`/`orElse`/`retry` — and the caller — see the
 *   run's true failure.
 * - Write-like effects (`WriteFile`, `AppendFile`, `TransformFile`,
 *   `CopyFile`, `CopyDirectory`, `DeleteFile`, `DeleteDirectory`, `MakeDir`,
 *   `Symlink`) — recorded, never executed. Each updates the overlay so later
 *   steps of the same plan observe it. `TransformFile` RUNS its (pure)
 *   transform against the overlay-or-real content — so a transform that would
 *   throw, throws here too — and a non-recursive `MakeDir` / colliding
 *   `Symlink` fails as the real `mkdir`/`symlink` would.
 * - `Exec` — NEVER spawned. It answers the same mock result as `dryRun`
 *   (`{ stdout: "", stderr: "", exitCode: 0 }`). This is a permanent,
 *   documented honesty limit (PR7 ruling R2): a preview that runs commands is
 *   not a preview, so a task whose success depends on an exec's real output
 *   can preview cleaner than it runs.
 * - `Prompt` — auto-answered with its default (first choice for a select),
 *   exactly as `dryRun` answers it: a plan is the effects a mutation WOULD
 *   apply, and a preview must never block on input.
 * - `Log` — recorded; forwarded to `onLog` when provided, printed never.
 * - `ReadContext` / `WriteContext` — real, against the (per-call) context map.
 * - `Parallel` — children are driven SEQUENTIALLY against the shared overlay,
 *   in declaration order, so overlay state is deterministic; a child failure
 *   propagates immediately (the real runner gathers every child's failure into
 *   `suppressed`; a preview stops at the first).
 * - `Race` — the first child is driven (matching `dryRun`); a real race's
 *   winner is timing-dependent, which a deterministic preview cannot be.
 *
 * `onEffectStart` is honored — called with each effect BEFORE it is recorded
 * or resolved. That is what lets summon's stamping transform (which rewrites a
 * write effect's content in `onEffectStart`) run during a preview, so planned
 * byte counts match the bytes the real run writes instead of under-reporting
 * by the stamp length. `onEffectComplete` fires after each successful effect.
 *
 * Recorded effects keep their AUTHORED paths (relative paths are not rewritten
 * to absolute), so a rendered plan is byte-comparable with one produced by
 * `dryRun`; the overlay keys resolve authored paths against `cwd` (or the
 * process cwd), matching how the production interpreter resolves them at I/O
 * time.
 *
 * Known modelling limits, beyond Exec (all documented deliberately —
 * each is a read-only approximation, never a write):
 * - `CopyDirectory` of a DIRECTORY records the destination directory but does
 *   not enumerate the copied children into the overlay. A FILE source — one
 *   the plan wrote or one already on disk — is copied as a file, because that
 *   is what `fs.cp` does with it.
 * - `DeleteDirectory { onlyIfEmpty: true }` is recorded with no overlay
 *   change: the real effect only removes a directory the task itself emptied,
 *   and silently skips every other case.
 * - A previewed `Symlink` is modelled by what its target is NOW, not through a
 *   live link: a link to a directory becomes a planned directory (its children
 *   are not enumerated), a link to a file a planned file holding the target's
 *   current bytes, and a link to an unreadable target reads back empty. The
 *   real `symlink` never reads its target, so no target read can fail a
 *   preview.
 *
 * On failure `runPreview` throws {@link TaskExecutionError}, exactly like
 * `runTask` — there is no partial-plan result.
 */

import * as path from "node:path";
import driveAsync from "./driveAsync.js";
import { mockEffect } from "./dry-run.js";
import { executeEffect, matchesPattern } from "./interpreter.js";
import type { DryRunResult, Effect, Task } from "./types.js";

/**
 * Options for {@link runPreview} — the preview-relevant subset of
 * `RunTaskOptions`. There is no `promptHandler` (prompts auto-answer, so a
 * preview can never hang on input) and no `signal` (a preview performs no
 * work worth interrupting).
 */
export interface PreviewOptions {
  /** Context for `ReadContext`/`WriteContext` effects. */
  context?: Map<string, unknown>;
  /**
   * Base directory RELATIVE effect paths resolve against, matching the
   * production interpreter's `cwd` option — pass the same value the real run
   * would receive, so the preview reads (and virtually writes) the same tree.
   */
  cwd?: string;
  /**
   * Called before each effect is recorded and resolved. Honoring this is part
   * of the honesty contract: summon's stamping transform mutates write
   * effects here, so the recorded plan carries post-stamp bytes.
   */
  onEffectStart?: (effect: Effect) => void;
  /** Called after each effect resolves, with its (preview) duration. */
  onEffectComplete?: (effect: Effect, duration: number) => void;
  /** Receives `Log` effects. When omitted a preview logs nothing. */
  onLog?: (level: "debug" | "info" | "warn" | "error", message: string) => void;
}

/** An `ENOENT`-shaped error for a path the overlay knows is absent. */
function enoent(op: string, target: string): NodeJS.ErrnoException {
  const error: NodeJS.ErrnoException = new Error(
    `ENOENT: no such file or directory, ${op} '${target}'`,
  );
  error.code = "ENOENT";
  return error;
}

/** An `EEXIST`-shaped error for a path the overlay knows is present. */
function eexist(op: string, target: string): NodeJS.ErrnoException {
  const error: NodeJS.ErrnoException = new Error(
    `EEXIST: file already exists, ${op} '${target}'`,
  );
  error.code = "EEXIST";
  return error;
}

/**
 * The virtual write overlay a preview drives its plan against: planned file
 * contents, planned directories, and tombstones for planned deletions —
 * consulted before the real filesystem, never written back to it.
 */
class Overlay {
  /** Planned file content, by resolved path. */
  readonly files = new Map<string, string>();
  /** Planned directories (including every ancestor of a planned file). */
  readonly dirs = new Set<string>();
  /** Planned deletions, by resolved path (a dir tombstone covers its subtree). */
  readonly tombstones = new Set<string>();

  /** Record a planned file at `key`, creating its ancestor directories. */
  putFile(key: string, content: string): void {
    this.files.set(key, content);
    this.tombstones.delete(key);
    this.putDir(path.dirname(key));
  }

  /**
   * Record a planned directory at `key`, with its ancestors. Tombstones on the
   * chain are left in place deliberately: {@link isTombstoned} consults planned
   * creations FIRST, so the re-created directory itself reads as present while
   * the rest of a deleted subtree stays gone — exactly what the real
   * delete-then-recreate leaves on disk.
   */
  putDir(key: string): void {
    let dir = key;
    for (;;) {
      this.dirs.add(dir);
      const parent = path.dirname(dir);
      if (parent === dir) return;
      dir = parent;
    }
  }

  /** Record a planned deletion of the file at `key`. */
  deleteFile(key: string): void {
    this.files.delete(key);
    this.tombstones.add(key);
  }

  /** Record a planned recursive deletion of the directory at `key`. */
  deleteDir(key: string): void {
    const prefix = key + path.sep;
    for (const file of [...this.files.keys()]) {
      if (file === key || file.startsWith(prefix)) this.files.delete(file);
    }
    for (const dir of [...this.dirs]) {
      if (dir === key || dir.startsWith(prefix)) this.dirs.delete(dir);
    }
    this.tombstones.add(key);
  }

  /**
   * Whether the plan has deleted `key` (directly, or via a deleted ancestor
   * directory) without re-creating it since. Planned creations win because
   * they are checked first by every caller.
   */
  isTombstoned(key: string): boolean {
    if (this.files.has(key) || this.dirs.has(key)) return false;
    if (this.tombstones.has(key)) return true;
    for (const dead of this.tombstones) {
      if (key.startsWith(dead + path.sep)) return true;
    }
    return false;
  }
}

/**
 * Run a task as an honest preview: reads real, writes recorded (see the
 * module doc for the full per-effect contract).
 *
 * @param task - The task to preview.
 * @param options - Context, `cwd`, and the effect callbacks.
 * @returns The task's value and the effects it would perform.
 * @throws TaskExecutionError exactly where and how `runTask` would throw.
 * @note Impure — reads the real filesystem (and never writes it).
 */
export const runPreview = async <A>(
  task: Task<A>,
  options: PreviewOptions = {},
): Promise<DryRunResult<A>> => {
  const {
    context = new Map(),
    cwd,
    onEffectStart,
    onEffectComplete,
    onLog,
  } = options;

  const effects: Effect[] = [];
  const overlay = new Overlay();

  // The overlay key for an authored path: resolved exactly as the production
  // interpreter resolves it at I/O time (against `cwd` when set, the process
  // cwd otherwise), so "./a" and its absolute form are one entry.
  const key = (p: string): string =>
    cwd ? path.resolve(cwd, p) : path.resolve(p);

  // Perform a real read through executeEffect (the production reader), so the
  // preview's disk answers — including Bun-vs-node glob behaviour — are the
  // run's.
  const real = (effect: Effect): Promise<unknown> =>
    executeEffect(effect, context, undefined, onLog, cwd);

  /** Whether the authored path currently exists, overlay first, then disk. */
  const previewExists = async (authored: string): Promise<boolean> => {
    const at = key(authored);
    if (overlay.files.has(at) || overlay.dirs.has(at)) return true;
    if (overlay.isTombstoned(at)) return false;
    return (await real({ _tag: "Exists", path: authored })) as boolean;
  };

  /**
   * The authored path's current content: planned content when the plan wrote
   * it, disk content when it exists, `undefined` when it is absent (planned
   * deletion or a real ENOENT).
   */
  const readCurrent = async (authored: string): Promise<string | undefined> => {
    const at = key(authored);
    const planned = overlay.files.get(at);
    if (planned !== undefined) return planned;
    if (overlay.isTombstoned(at)) return undefined;
    try {
      return (await real({ _tag: "ReadFile", path: authored })) as string;
    } catch (thrown) {
      if ((thrown as NodeJS.ErrnoException).code === "ENOENT") return undefined;
      throw thrown;
    }
  };

  /**
   * The authored path's disk content when it is a readable FILE, `undefined`
   * otherwise. Unlike {@link readCurrent} a failed read is an ANSWER, not a
   * failure: the caller is asking which of file-or-directory the path is, has
   * no stat effect to ask with, and treats "not provably a file" as a
   * directory — the same degradation a previewed `Symlink` makes of an
   * unreadable target. Nothing here can fail a preview that would otherwise
   * succeed: the answer only decides which KIND is recorded in the overlay.
   */
  const readIfFile = async (authored: string): Promise<string | undefined> => {
    try {
      return (await real({ _tag: "ReadFile", path: authored })) as string;
    } catch {
      return undefined;
    }
  };

  // Resolve one leaf effect against the overlay + the real filesystem. The
  // structural Parallel/Race tags are excluded by type: resolvePreview has
  // already routed them, so this switch is exhaustive over the leaves.
  const resolveLeaf = async (
    effect: Exclude<Effect, { _tag: "Parallel" } | { _tag: "Race" }>,
  ): Promise<unknown> => {
    switch (effect._tag) {
      case "ReadFile": {
        const at = key(effect.path);
        const planned = overlay.files.get(at);
        if (planned !== undefined) return planned;
        if (overlay.isTombstoned(at)) throw enoent("open", at);
        return real(effect);
      }

      case "Exists":
        return previewExists(effect.path);

      case "Glob": {
        const globCwd = key(effect.cwd);
        // A deleted glob root fails in the real run (scandir ENOENT) — and so
        // here; a root the PLAN created exists only in the overlay, so the
        // real scan's ENOENT is not the run's outcome and is swallowed.
        if (overlay.isTombstoned(globCwd)) throw enoent("scandir", globCwd);
        let found: string[] = [];
        try {
          found = (await real(effect)) as string[];
        } catch (thrown) {
          if (
            !overlay.dirs.has(globCwd) ||
            (thrown as NodeJS.ErrnoException).code !== "ENOENT"
          ) {
            throw thrown;
          }
        }
        const matches = found.filter(
          (rel) => !overlay.isTombstoned(path.join(globCwd, rel)),
        );
        for (const file of overlay.files.keys()) {
          if (!file.startsWith(globCwd + path.sep)) continue;
          const rel = path.relative(globCwd, file);
          if (matchesPattern(rel, effect.pattern) && !matches.includes(rel)) {
            matches.push(rel);
          }
        }
        return matches;
      }

      case "WriteFile":
        overlay.putFile(key(effect.path), effect.content);
        return undefined;

      case "AppendFile": {
        // The real append creates a missing file either way (`createIfMissing`
        // only pre-creates it), so a missing current content appends to "".
        const current = (await readCurrent(effect.path)) ?? "";
        overlay.putFile(key(effect.path), current + effect.content);
        return undefined;
      }

      case "TransformFile": {
        const current = await readCurrent(effect.path);
        if (current === undefined) throw enoent("open", key(effect.path));
        // The transform is pure by contract; if it throws, the real run
        // throws identically, so let it propagate into the recovery channel.
        overlay.putFile(key(effect.path), effect.transform(current));
        return undefined;
      }

      case "CopyFile": {
        const content = await readCurrent(effect.source);
        if (content === undefined) throw enoent("copyfile", key(effect.source));
        overlay.putFile(key(effect.dest), content);
        return undefined;
      }

      case "CopyDirectory": {
        const sourceKey = key(effect.source);
        const planned = overlay.files.get(sourceKey);
        if (planned !== undefined) {
          // `fs.cp` copies a file source as a file.
          overlay.putFile(key(effect.dest), planned);
          return undefined;
        }
        if (!(await previewExists(effect.source))) {
          throw enoent("lstat", sourceKey);
        }
        // The source is not a planned file, so it is whatever is on disk — and
        // `fs.cp` copies a FILE source as a file, not as a directory. With no
        // stat effect to ask, reading is how the two are told apart: a read
        // that fails is the answer "not a file". Calling a real file a planned
        // directory would make a later `ReadFile(dest)` in the same plan fail
        // where the run succeeds. A directory the PLAN made is known already,
        // and is not re-read against a disk that does not have it yet.
        if (!overlay.dirs.has(sourceKey)) {
          const onDisk = await readIfFile(effect.source);
          if (onDisk !== undefined) {
            overlay.putFile(key(effect.dest), onDisk);
            return undefined;
          }
        }
        overlay.putDir(key(effect.dest));
        return undefined;
      }

      case "DeleteFile":
        // The real delete tolerates a missing target, so no failure to model.
        overlay.deleteFile(key(effect.path));
        return undefined;

      case "DeleteDirectory":
        // `onlyIfEmpty` only removes a directory the task itself emptied and
        // silently skips every other case — recorded, no overlay change.
        if (!effect.onlyIfEmpty) overlay.deleteDir(key(effect.path));
        return undefined;

      case "MakeDir": {
        const at = key(effect.path);
        if (!effect.recursive) {
          // The real non-recursive mkdir throws EEXIST on a present path and
          // ENOENT on a missing parent; a recursive one does neither.
          if (await previewExists(effect.path)) throw eexist("mkdir", at);
          if (!(await previewExists(path.dirname(effect.path)))) {
            throw enoent("mkdir", at);
          }
        }
        overlay.putDir(at);
        return undefined;
      }

      case "Symlink": {
        const at = key(effect.path);
        if (await previewExists(effect.path)) throw eexist("symlink", at);
        const target = path.isAbsolute(effect.target)
          ? effect.target
          : path.resolve(path.dirname(at), effect.target);
        // The real `symlink` never READS its target — it fails only on an
        // occupied path — so nothing about the target may fail the preview.
        // The read below exists only to model what a LATER read through the
        // planned link would see: a directory target becomes a planned
        // directory, a file target a planned file carrying the target's current
        // bytes, and an unreadable target reads back empty.
        let planned: string | undefined;
        let targetIsDir = overlay.dirs.has(target);
        if (!targetIsDir) {
          try {
            planned = await readCurrent(target);
          } catch (thrown) {
            targetIsDir = (thrown as NodeJS.ErrnoException).code === "EISDIR";
          }
        }
        if (targetIsDir) overlay.putDir(at);
        else overlay.putFile(at, planned ?? "");
        return undefined;
      }

      case "Exec":
      case "Prompt":
        // Exec: NEVER spawned (ruling R2); Prompt: auto-answered with its
        // default. Both take dryRun's mock answer — one source of truth.
        return mockEffect(effect);

      case "Log":
        onLog?.(effect.level, effect.message);
        return undefined;

      case "ReadContext":
        return context.get(effect.key);

      case "WriteContext":
        context.set(effect.key, effect.value);
        return undefined;
    }
  };

  // Resolve any effect: structural Parallel/Race drive their children through
  // the shared trampoline (sequentially, against the shared overlay); leaves
  // are announced, recorded, resolved, and reported.
  const resolvePreview = async (effect: Effect): Promise<unknown> => {
    if (effect._tag === "Parallel") {
      onEffectStart?.(effect);
      const startTime = performance.now();
      const results: unknown[] = [];
      for (const child of effect.tasks) {
        results.push(await driveAsync(child, resolvePreview));
      }
      onEffectComplete?.(effect, performance.now() - startTime);
      return results;
    }

    if (effect._tag === "Race") {
      onEffectStart?.(effect);
      const startTime = performance.now();
      const first = effect.tasks.at(0);
      const result =
        first === undefined
          ? undefined
          : await driveAsync(first, resolvePreview);
      onEffectComplete?.(effect, performance.now() - startTime);
      return result;
    }

    onEffectStart?.(effect);
    const startTime = performance.now();
    effects.push(effect);
    const result = await resolveLeaf(effect);
    onEffectComplete?.(effect, performance.now() - startTime);
    return result;
  };

  const value = (await driveAsync(task as Task<unknown>, resolvePreview)) as A;
  return { value, effects };
};
