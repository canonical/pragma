/**
 * The PLAN interpreter: reads are real, destruction is simulated.
 *
 * This is what backs a user-facing `--dry-run` / plan-first preview. It exists
 * because the node-free mocking collector (`dryRun`, in `lib/dry-run.ts`)
 * cannot back one honestly: it answers `ReadFile` with the literal string
 * `[mock content of <path>]` and `Exists` from a virtual filesystem that starts
 * EMPTY, so a task whose shape depends on what it reads plans a different shape
 * than it runs — and a task whose real run dies on a read plans a full success.
 *
 * Measured on `pragma config set tier apps/lxd` against an existing global
 * config holding two other fields: the mocked preview reported
 * `Check exists / Created dir / Write file (25 bytes)` with **no read at all**,
 * because `exists` answered false and the read-and-merge branch was skipped
 * entirely. The real run reads, merges, and writes **78 bytes**. The preview
 * advertised a write that would have deleted two of the user's settings, and
 * exited 0.
 *
 * ## The rule
 *
 * An effect is performed FOR REAL when it only observes, and SIMULATED when it
 * would destroy, create, or escape the process:
 *
 * - real, delegated to `executeEffect`: `ReadFile`, `Exists`, `Glob`,
 *   `ReadContext`, `WriteContext`;
 * - real read half only: `TransformFile`;
 * - simulated: `WriteFile`, `AppendFile`, `CopyFile`, `CopyDirectory`,
 *   `DeleteFile`, `DeleteDirectory`, `MakeDir`, `Symlink`, `Exec`, `Log`;
 * - mocked: `Prompt`.
 *
 * Decisions worth their reasons:
 *
 * - **The real arms delegate to `executeEffect` rather than re-implementing fs
 *   access.** Two readings of "read a file" would drift, and this package
 *   enforces 100% coverage — a small module is a coverable one.
 * - **`WriteContext` is real.** It is in-memory and escapes nothing. Mocking it
 *   (as `mockEffect` does, returning `undefined`) makes every later
 *   `ReadContext` in the same task read nothing, so a context-carrying plan
 *   diverges from its own run for no gain.
 * - **`TransformFile` performs its read.** A missing file or a throwing
 *   transform then fails the plan exactly as it fails the run. Its OUTPUT goes
 *   to the overlay, not to the disk — so a transform chain plans the bytes it
 *   runs. Discarding it made `transform(+"|one")` then `transform(+"|two")`
 *   then `read` plan `"base"` where the run produced `"base|one|two"`, with the
 *   second transform fed the pre-plan text.
 * - **`Log` is simulated.** The caller renders a `Log` effect as a plan line;
 *   executing it too would print the message twice.
 * - **`Prompt` reuses `mockEffect`'s arm** (imported from the node-free
 *   `./dry-run.js`) so the two interpreters cannot drift on prompt defaults,
 *   and so a plan still installs no prompt handler — `PlanTaskOptions` has no
 *   `promptHandler` field at all, rather than accepting and ignoring one.
 * - **A virtual overlay** records what a simulated write WOULD leave at a path,
 *   keyed on the RESOLVED path so it agrees with `executeEffect`'s own `at()`.
 *   A later `Exists` on a path this plan just "wrote" answers true, and a later
 *   `ReadFile` on one answers with the planned content: a plan is consistent
 *   with itself without touching the disk. That holds for the three tags whose
 *   result is a document — `WriteFile`, `AppendFile`, `TransformFile` — and the
 *   boundary for the rest is stated below rather than left to be discovered.
 * - **The ANCESTOR directories a write brings into being are marked too.**
 *   `executeEffect` `mkdir -p`s the parent before every `WriteFile`,
 *   `AppendFile`, copy and `Symlink`, and `MakeDir` honours `recursive`, so the
 *   run creates directories no leaf path names. Before this, `writeFile("a/b.txt")`
 *   then `exists("a")` answered `false` to the plan and `true` to the run — a
 *   divergence in the OPPOSITE direction from every residual named below, and
 *   therefore the one a reader of that list would have ruled out.
 *
 * ## Residual falsehoods, named rather than hidden
 *
 * - `Exec` answers `{ stdout: "", stderr: "", exitCode: 0 }`, so a task that
 *   branches on an exec's output plans against an empty string. Running the
 *   command for real is the thing a plan most obviously must not do.
 * - **`CopyFile`/`CopyDirectory`, `MakeDir` and `Symlink` record PRESENCE, not
 *   content.** A later `Exists` on the destination answers true; a later
 *   `ReadFile` of it falls through to the disk and fails, where the run would
 *   have read the copied bytes. `CopyDirectory` and `MakeDir` have no single
 *   document to model at all, and modelling `CopyFile` alone would mean one of
 *   the four behaving unlike the other three. `CopyFile`/`CopyDirectory` also do
 *   not probe their SOURCE, so a missing copy source is a plan that succeeds
 *   where the run fails.
 * - **`Glob` does not see the overlay.** It is delegated whole to the real
 *   interpreter, so a plan that writes `new.txt` and then globs `*.txt` gets the
 *   pre-plan file set — measured: plan `["src.txt","a.txt"]`, run
 *   `["src.txt","new.txt","a.txt"]`. Answering it honestly means re-implementing
 *   the matcher over virtual paths, and a matcher that disagreed with the real
 *   one would be a worse falsehood than this one.
 * - A simulated DELETE is not subtracted from the real filesystem's answers: a
 *   later `Exists` still sees the file. Modelling subtraction would mean
 *   modelling the real tree, and a wrong subtraction reads as "gone" when it is
 *   not.
 *
 * @module
 */

import * as path from "node:path";
import driveAsync, { interruptGuard } from "./driveAsync.js";
import { mockEffect } from "./dry-run.js";
import { executeEffect } from "./interpreter.js";
import type { Effect, Task } from "./types.js";

/**
 * The outcome of interpreting a task as a PLAN: the value the task produced
 * against real reads, and the effects it reached. Structurally identical to
 * `DryRunResult` and deliberately a separate name — the two carry different
 * promises about how their `value` was obtained, and a shared alias would invite
 * the mocking collector back onto a user-facing preview.
 *
 * Declared HERE, and published from `@canonical/task/node` beside {@link
 * planTask}, because a result type belongs to the entry its producer ships from
 * — the precedent `runUndo`/`UndoResult` already set. It was on the base entry
 * while its only producer was on the node entry, so a consumer typing a
 * `planTask` result had to import from two places.
 */
export interface PlanResult<A> {
  value: A;
  effects: Effect[];
}

/** Every effect except the structural ones the planner resolves itself. */
type LeafEffect = Exclude<Effect, { _tag: "Parallel" | "Race" }>;

/**
 * Options for {@link planTask}. Deliberately a subset of `RunTaskOptions`:
 * there is no `promptHandler` (a plan never asks) and no `onLog` (a plan never
 * logs — the `Log` effect is a plan line, not output).
 */
export interface PlanTaskOptions {
  /** Context for storing values between effects. */
  context?: Map<string, unknown>;
  /**
   * Base directory RELATIVE fs-effect paths resolve against — the same meaning
   * `RunTaskOptions.cwd` carries. A plan that reads for real MUST resolve paths
   * exactly as its run does, or it reads the wrong files.
   */
  cwd?: string;
  /** Called before each effect is interpreted. */
  onEffectStart?: (effect: Effect) => void;
  /** Called after each effect is interpreted. */
  onEffectComplete?: (effect: Effect, duration: number) => void;
  /** AbortSignal for interrupting the plan. */
  signal?: AbortSignal;
}

/**
 * Interpret a task as a PLAN: perform every observing effect for real, simulate
 * every destructive one, and collect the effects in the order they were reached.
 *
 * A real read that throws is normalised and routed through the same recovery
 * channel `runTask` uses, so `recover`/`orElse`/`retry` see it and, unhandled,
 * it escapes as a `TaskExecutionError` — which is the point: a capability whose
 * real run dies on a read can no longer plan a full success.
 *
 * @typeParam A - The task's result type.
 * @param task - The task to plan.
 * @param options - Context, cwd, effect callbacks, and abort signal.
 * @returns The task's value and the effects it reached.
 * @note Impure — performs real reads.
 */
export const planTask = async <A>(
  task: Task<A>,
  options: PlanTaskOptions = {},
): Promise<PlanResult<A>> => {
  const {
    context = new Map(),
    cwd,
    onEffectStart,
    onEffectComplete,
    signal,
  } = options;

  const effects: Effect[] = [];
  /**
   * Resolved path → the content a simulated write would leave there, or
   * `undefined` for "this plan creates it, but its bytes are not modelled"
   * (`MakeDir`, `Symlink`, a copy destination). PRESENCE is what `Exists`
   * answers from; the VALUE is what a read answers with, so the two questions
   * are asked separately — `has` vs `get` — rather than through one `undefined`
   * that cannot tell "absent" from "content unknown".
   */
  const overlay = new Map<string, string | undefined>();
  const at = (p: string): string => (cwd ? path.resolve(cwd, p) : p);
  const checkInterrupted = interruptGuard(signal);

  /**
   * Mark the DIRECTORIES a simulated write would bring into being, so a plan
   * agrees with its run about them.
   *
   * `executeEffect` runs `fs.mkdir(dirname(target), { recursive: true })` before
   * every `WriteFile`, `AppendFile`, copy and `Symlink`, and `MakeDir` honours
   * `recursive` — so the run creates ancestors the overlay never recorded.
   * Measured before this: `writeFile("a/b.txt")` then `exists("a")` answered
   * `false` to the plan and `true` to the run; `mkdir("x/y", recursive)` then
   * `exists("x")` the same. That is the OPPOSITE direction from the residuals
   * named above (which make a plan claim more exists than does), so a reader of
   * that list would have concluded it could not happen.
   *
   * Presence only, never content — the same split `MakeDir` itself records, so
   * a `ReadFile` of a marked directory still falls through to the disk and
   * fails the way it fails for the run. Walking stops at the first path already
   * in the overlay, which makes the whole loop amortized O(1) after the first
   * write under a given root, and never overwrites a path whose bytes ARE
   * modelled.
   *
   * @param target - An already-resolved leaf path.
   */
  const markAncestors = (target: string): void => {
    let dir = path.dirname(target);
    while (!overlay.has(dir)) {
      overlay.set(dir, undefined);
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  };


  /** Delegate one effect to the real interpreter, with no prompt/log handler. */
  const real = (effect: Effect): Promise<unknown> =>
    executeEffect(effect, context, undefined, undefined, cwd);

  /** The real file's bytes, or `undefined` when it is not there. */
  const realSource = async (target: string): Promise<string | undefined> => {
    try {
      return (await real({ _tag: "ReadFile", path: target })) as string;
    } catch {
      return undefined;
    }
  };

  /**
   * The bytes a `ReadFile`/`TransformFile` should observe: what this plan
   * already planned to write there, else the real file. A path the plan created
   * WITHOUT modelled content falls through to the real read, and so still
   * fails the way a read of a file this plan has not written fails.
   */
  const sourceOf = async (target: string): Promise<string> => {
    const key = at(target);
    const planned = overlay.get(key);
    if (planned !== undefined) return planned;
    return (await real({ _tag: "ReadFile", path: target })) as string;
  };

  // `Parallel`/`Race` are resolved by `perform` before a leaf is reached, so
  // they are typed OUT here rather than handled as unreachable arms — the
  // exhaustiveness check then costs no uncoverable code.
  const interpretLeaf = async (effect: LeafEffect): Promise<unknown> => {
    switch (effect._tag) {
      // ---- observed for real -------------------------------------------
      case "Exists":
        // A path this plan would have created exists as far as this plan is
        // concerned; otherwise ask the disk.
        return overlay.has(at(effect.path)) ? true : real(effect);

      case "ReadFile":
        return sourceOf(effect.path);

      case "Glob":
      case "ReadContext":
      case "WriteContext":
        return real(effect);

      case "TransformFile": {
        // The READ half for real (so a missing file or a throwing transform
        // fails the plan exactly as it fails the run); the WRITE half lands in
        // the overlay, so a second transform of the same path sees the first
        // one's output and a later `ReadFile` answers with the transformed text.
        // Nothing reaches the disk.
        overlay.set(
          at(effect.path),
          effect.transform(await sourceOf(effect.path)),
        );
        return undefined;
      }

      // ---- simulated ----------------------------------------------------
      case "WriteFile":
        markAncestors(at(effect.path));
        overlay.set(at(effect.path), effect.content);
        return undefined;

      case "AppendFile":
        // The appended document, so a later read answers with it. The real read
        // of the base goes through `real()`, which does not push into `effects`
        // — the plan's effect SEQUENCE still matches the run's. `executeEffect`
        // appends with node's default `a` flag, which creates a missing file, so
        // an absent base is the empty string on both sides.
        markAncestors(at(effect.path));
        overlay.set(
          at(effect.path),
          (overlay.get(at(effect.path)) ??
            (await realSource(effect.path)) ??
            "") + effect.content,
        );
        return undefined;

      case "MakeDir":
        // `recursive: false` is `fs.mkdir`'s own contract: the parent must
        // already be there, so the run creates no ancestor either.
        if (effect.recursive) markAncestors(at(effect.path));
        overlay.set(at(effect.path), undefined);
        return undefined;

      case "Symlink":
        markAncestors(at(effect.path));
        overlay.set(at(effect.path), undefined);
        return undefined;

      case "CopyFile":
      case "CopyDirectory":
        markAncestors(at(effect.dest));
        overlay.set(at(effect.dest), undefined);
        return undefined;

      case "DeleteFile":
      case "DeleteDirectory":
        return undefined;

      case "Exec":
      case "Log":
      case "Prompt":
        return mockEffect(effect);
    }
  };

  const perform = async (effect: Effect): Promise<unknown> => {
    if (effect._tag === "Parallel" || effect._tag === "Race") {
      onEffectStart?.(effect);
      const structuralStart = performance.now();
      // Children are driven SEQUENTIALLY through the same overlay. A plan is a
      // description, and interleaving children's overlay writes would make the
      // recorded effect order depend on scheduling. `Race` describes the first
      // branch, matching the mocking collector.
      const children =
        effect._tag === "Race" ? effect.tasks.slice(0, 1) : effect.tasks;
      const results: unknown[] = [];
      for (const child of children) {
        results.push(await driveAsync(child, perform, checkInterrupted));
      }
      onEffectComplete?.(effect, performance.now() - structuralStart);
      return effect._tag === "Race" ? results.at(0) : results;
    }

    effects.push(effect);
    onEffectStart?.(effect);
    const startTime = performance.now();
    const result = await interpretLeaf(effect);
    onEffectComplete?.(effect, performance.now() - startTime);
    return result;
  };

  const value = await driveAsync(task, perform, checkInterrupted);
  return { value, effects };
};
