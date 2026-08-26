import driveSync from "./driveSync.js";
import { mockEffectWithFs } from "./dry-run.js";
import { TaskExecutionError } from "./errors.js";
import type { Effect, Task } from "./types.js";

/**
 * Options for {@link collectUndos}.
 */
export interface CollectUndosOptions {
  /**
   * Resolve whether a path already exists on the host, for `Exists` effects
   * during the walk. Composed with the walk's own virtual filesystem: a path
   * created earlier in the walk is always present, otherwise this resolver's
   * answer is the preferred resolution (subject to fail-backtracking, below).
   *
   * Without it, every `Exists` the walk itself did not satisfy prefers
   * `false` — which makes any task that branches on pre-existing host state
   * (`ifElseM(exists(p), ...)`) collect undos from the wrong branch.
   * `runUndo` (`@canonical/task/node`) always supplies a real-filesystem
   * resolver for exactly this reason; pass one here when collecting undos
   * for display so the preview matches what `runUndo` will execute.
   *
   * Note the deliberate asymmetry: `Exists` can be resolved against the host,
   * but `ReadFile` stays mocked. Reading real content during undo collection
   * would let the walk observe the forward run's own edits (e.g. an
   * append-if-absent helper would see the very line the forward run appended
   * and skip collecting its remove-line undo). Real existence + mocked
   * content is the contract.
   */
  resolveExists?: (path: string) => boolean;
}

/**
 * Upper bound on fail-backtracking walk restarts. Guards are rare (a handful
 * per generator), so real tasks converge in one or two attempts; the cap only
 * arrests a pathological tree.
 */
const MAX_WALK_ATTEMPTS = 64;

/** One free `Exists` resolution made during a walk attempt. */
interface ExistsDecision {
  /** The value the walk used. */
  value: boolean;
  /** The value the resolver preferred (false when no resolver is given). */
  preferred: boolean;
}

/** Shared mutable state for one walk attempt (spans Parallel/Race children). */
interface WalkState {
  /** Paths created by write-like effects earlier in this attempt. */
  virtualFs: Set<string>;
  /** Undos collected this attempt, in forward order. */
  undos: Task<void>[];
  /** Free `Exists` decisions in encounter order. */
  decisions: ExistsDecision[];
  /** Values forced for the first N decisions (backtracking overrides). */
  overrides: readonly boolean[];
  resolveExists?: (path: string) => boolean;
}

/**
 * Collect undo tasks from a task tree without executing any effects.
 * Forward effects are mocked (same as dryRun). Only the `undo` field
 * on each effect is collected.
 *
 * The task being undone is assumed to have run successfully forward, so the
 * walk must not end in a `Fail` — a successful run never took a failing
 * branch. When an `Exists` resolution steers the walk into a failure (e.g. a
 * fail-if-present guard on a file the forward run itself created, which the
 * host now reports as existing), the walk backtracks: the most recent
 * still-preferred `Exists` decision is flipped and the walk restarts. A
 * failure no flip can avoid is genuine and is rethrown.
 *
 * Node-free by construction — the walk mocks every forward effect, and host
 * state only enters through the injected `resolveExists` — so it lives in the
 * base entry; executing the collected undos against the host is `runUndo`'s
 * job (`@canonical/task/node`).
 *
 * @param task - The task to collect undos from
 * @param options - Optional host-state resolution, see {@link CollectUndosOptions}
 * @returns Array of undo tasks in forward execution order
 */
export const collectUndos = <A>(
  task: Task<A>,
  options?: CollectUndosOptions,
): Task<void>[] => {
  const walk = (
    overrides: readonly boolean[],
  ): { state: WalkState; error: TaskExecutionError | null } => {
    const state: WalkState = {
      virtualFs: new Set(),
      undos: [],
      decisions: [],
      overrides,
      resolveExists: options?.resolveExists,
    };
    try {
      collectUndosInto(task as Task<unknown>, state);
      return { state, error: null };
    } catch (error) {
      if (!(error instanceof TaskExecutionError)) {
        throw error;
      }
      return { state, error };
    }
  };

  let overrides: readonly boolean[] = [];
  let verified = false;

  for (let attempt = 0; attempt < MAX_WALK_ATTEMPTS; attempt++) {
    const { state, error } = walk(overrides);

    if (error === null) {
      return state.undos;
    }

    if (state.decisions.length === 0) {
      throw error; // Unconditional failure: nothing to flip.
    }

    // Backtracking re-walks the tree, which is only sound for a
    // re-interpretable task. Before the first flip, replay the failed walk's
    // exact decisions and require the same failure to reproduce — a task
    // built on shared one-shot state (a gen() iterator) resumes mid-body and
    // "succeeds" vacuously, and must surface the genuine failure instead of a
    // silently wrong undo plan.
    if (!verified) {
      const replay = walk(state.decisions.map((d) => d.value));
      if (replay.error === null) {
        throw error;
      }
      verified = true;
    }

    const flipped = flipLastPreferred(state.decisions);
    if (flipped === null) {
      // No Exists decision left to revisit: the failure is real.
      throw error;
    }
    overrides = flipped;
  }

  // Unreachable for sane trees; the cap guards against pathological ones.
  throw new TaskExecutionError({
    code: "UNDO_COLLECTION_DIVERGED",
    message: `collectUndos did not converge within ${MAX_WALK_ATTEMPTS} walk attempts`,
  });
};

/**
 * Backtrack one step: find the last decision still at its preferred value,
 * and return an override list that repeats every earlier decision verbatim
 * but flips that one (later decisions revert to preference). Returns null
 * when every decision has already been flipped — the search is exhausted.
 *
 * @param decisions - The decisions of the failed walk, in encounter order.
 * @returns The next override list, or null when exhausted.
 */
const flipLastPreferred = (
  decisions: readonly ExistsDecision[],
): boolean[] | null => {
  for (let i = decisions.length - 1; i >= 0; i--) {
    if (decisions[i].value === decisions[i].preferred) {
      const next = decisions.slice(0, i + 1).map((d) => d.value);
      next[i] = !decisions[i].preferred;
      return next;
    }
  }
  return null;
};

/**
 * Walk a task tree with mocked forward effects over the attempt's shared
 * virtual filesystem, appending each effect's `undo` task (in forward order)
 * to the attempt state, and returning the task's mocked forward value.
 * Forward mocking mirrors `dryRun` — `Parallel` resolves to the array of its
 * children's mocked values and `Race` to its first child's — except `Exists`,
 * which resolves from the virtual filesystem, then the attempt's overrides,
 * then the preferred value from `resolveExists` (false without a resolver),
 * recording each free decision for backtracking. `Parallel`/`Race` children
 * share the attempt state, and the forward walk is trampolined via
 * {@link driveSync}, so deep chains stay stack-safe.
 *
 * @param task - The task to collect undos from.
 * @param state - The walk attempt's shared mutable state.
 * @returns The task's mocked forward value.
 * @note Impure — mutates the shared attempt `state`.
 */
const collectUndosInto = (task: Task<unknown>, state: WalkState): unknown => {
  const resolveEffect = (effect: Effect): unknown => {
    if ("undo" in effect && effect.undo) {
      state.undos.push(effect.undo);
    }

    if (effect._tag === "Parallel") {
      return effect.tasks.map((child) => collectUndosInto(child, state));
    }

    if (effect._tag === "Race") {
      const first = effect.tasks.at(0);
      if (first !== undefined) {
        return collectUndosInto(first, state);
      }
      return undefined;
    }

    if (effect._tag === "Exists") {
      // A path this walk already created is present regardless of the host.
      if (state.virtualFs.has(effect.path)) {
        return true;
      }
      const preferred = state.resolveExists?.(effect.path) ?? false;
      const index = state.decisions.length;
      const value =
        index < state.overrides.length ? state.overrides[index] : preferred;
      state.decisions.push({ value, preferred });
      return value;
    }

    return mockEffectWithFs(effect, state.virtualFs);
  };

  return driveSync(task, resolveEffect);
};
