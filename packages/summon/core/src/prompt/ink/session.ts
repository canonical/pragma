/**
 * The Ink wizard's controller — plain TypeScript, NO React.
 *
 * It sits between the seam (which drives the task and calls it per `Prompt`
 * effect + per completed effect) and the React `<Wizard>` view (which
 * subscribes to it). This split keeps the answer/preview/progress state machine
 * out of React and lets the view be a pure projection of controller state.
 *
 * Lives under `prompt/ink/**`, so it is only ever reached through the dynamic
 * `import("./mount.js")` boundary — it never lands in summon-core's static
 * graph, even though it carries no JSX itself.
 */

import {
  type Effect,
  type LogLevel,
  type TaskError,
  TaskExecutionError,
} from "@canonical/task";
import { runPreview } from "@canonical/task/node";
import {
  CONFIRM_ANSWER_KEY,
  GENERATOR_CANCELLED,
} from "../../execute/execute.js";
import type GeneratorDefinition from "../../types/GeneratorDefinition.js";
import type { StepReport } from "../inkPrompt.js";
import type { PromptEffect } from "../types.js";

/** The wizard's coarse lifecycle phase. */
export type WizardPhase =
  | "idle"
  | "prompting"
  | "confirming"
  | "executing"
  | "complete"
  | "error"
  | "cancelled";

/** An effect plus the time (ms, relative to execution start) it completed. */
export interface TimedEffect {
  readonly effect: Effect;
  readonly timestamp: number;
  /**
   * How long the effect itself took, in milliseconds, as measured by the
   * interpreter and handed to the seam's `onEffectComplete`. KEPT rather than
   * dropped: the live view renders it as `✓ <effect> (12ms)` — the spelling
   * the summon binary's own progress view already uses.
   */
  readonly duration: number;
}

/**
 * One host-named step's live state — a {@link StepReport} folded into the
 * view model. `duration` is measured HERE, from the step's `start` report to
 * its completion report, so it covers the step's whole wall time (every effect
 * it spans) rather than any single effect's.
 */
export interface StepProgress {
  readonly key: string;
  readonly label: string;
  readonly status: "running" | "done" | "failed";
  /** Wall-clock ms from `start` to completion; set on `done`/`failed`. */
  readonly duration?: number;
}

/** The immutable snapshot the React view renders. A new object per change. */
export interface WizardState {
  readonly phase: WizardPhase;
  readonly generator: GeneratorDefinition;
  readonly answers: Record<string, unknown>;
  /** The active non-confirm prompt, when `phase === "prompting"`. */
  readonly activeQuestion?: PromptEffect;
  /** 1-based index of the active prompt among applicable prompts. */
  readonly step: number;
  /** Count of applicable prompts (respecting `when`) at this point. */
  readonly total: number;
  /** The dry-run plan shown at the confirm gate. */
  readonly previewEffects: readonly Effect[];
  /** Effects completed so far during execution. */
  readonly progress: readonly TimedEffect[];
  /**
   * Host-named steps reported so far ({@link SessionController.reportStep}).
   * Non-empty ONLY for a host that narrates its run in its own units; the
   * view then renders these rows instead of the per-effect transcript.
   */
  readonly steps: readonly StepProgress[];
  /** A failure, when `phase === "error"`. */
  readonly error?: TaskError;
}

/** The prompts that apply given the answers so far (respecting `when`). */
function listApplicablePrompts(
  generator: GeneratorDefinition,
  answers: Record<string, unknown>,
): readonly GeneratorDefinition["prompts"][number][] {
  return generator.prompts.filter((p) => !p.when || p.when(answers) === true);
}

/** Count the prompts that apply given the answers so far (respecting `when`). */
function countApplicable(
  generator: GeneratorDefinition,
  answers: Record<string, unknown>,
): number {
  return listApplicablePrompts(generator, answers).length;
}

/**
 * Count the APPLICABLE prompts already answered. The answer bag can carry
 * keys that are not generator prompts at all (pragma's `framework` param) or
 * answers to prompts a `when` currently excludes — counting raw keys let the
 * step counter exceed the total.
 */
function countAnswered(
  generator: GeneratorDefinition,
  answers: Record<string, unknown>,
): number {
  return listApplicablePrompts(generator, answers).filter((p) =>
    Object.hasOwn(answers, p.name),
  ).length;
}

/**
 * The controller: a tiny observable state machine driving the Ink wizard.
 */
export class SessionController {
  private current: WizardState;
  private readonly listeners = new Set<() => void>();
  private pending?: {
    readonly effect: PromptEffect;
    readonly isConfirm: boolean;
    readonly resolve: (value: unknown) => void;
    readonly reject: (error: unknown) => void;
  };
  private executionStart = 0;

  /** The confirm gate's in-flight preview, awaited only by {@link previewSettled}. */
  private previewInFlight?: Promise<void>;

  /**
   * @param generator - The generator being run.
   * @param onUserCancel - Invoked once when the user cancels (Ctrl-C / escape).
   *   The seam wires this to the run's `AbortController.abort()`, so a Ctrl-C
   *   DURING execution actually interrupts the interpreter (its
   *   `checkInterrupted` fires between effects) instead of only rejecting a
   *   — by then non-existent — pending prompt. `abort()` is idempotent, so the
   *   signal→cancel→abort path cannot loop.
   * @param cwd - The write root the run will resolve relative effect paths
   *   against. The preview reads the SAME tree, so the gate's plan is the plan
   *   the run produces. Omitted falls back to the process cwd, matching a run
   *   whose interpreter was given no `cwd`.
   */
  constructor(
    generator: GeneratorDefinition,
    private readonly onUserCancel?: () => void,
    private readonly cwd?: string,
    initialAnswers: Readonly<Record<string, unknown>> = {},
  ) {
    // Seed flag/MCP-provided answers: collectAnswers never asks for them, so
    // without the seed the confirm gate's preview and the step counter run
    // against an answer set with those values missing.
    this.current = {
      phase: "idle",
      generator,
      answers: { ...initialAnswers },
      step: 0,
      total: countApplicable(generator, { ...initialAnswers }),
      previewEffects: [],
      progress: [],
      steps: [],
    };
  }

  /** Subscribe to state changes; returns an unsubscribe function. */
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /** The current immutable snapshot (stable identity between changes). */
  getSnapshot = (): WizardState => this.current;

  private set(next: Partial<WizardState>): void {
    this.current = { ...this.current, ...next };
    for (const listener of this.listeners) listener();
  }

  // ---- seam → controller ---------------------------------------------------

  /**
   * A `Prompt` effect arrived from the running task. Returns a promise the
   * view resolves once the user answers (or the run is cancelled).
   */
  request(effect: PromptEffect): Promise<unknown> {
    return new Promise<unknown>((resolve, reject) => {
      const isConfirm = effect.question.name === CONFIRM_ANSWER_KEY;
      this.pending = { effect, isConfirm, resolve, reject };
      if (isConfirm) {
        // The gate renders AT ONCE with an empty pane, then re-renders when the
        // honest preview resolves — the pane is ordinary Ink state, so there is
        // no synchronous constraint to satisfy.
        this.set({ phase: "confirming", previewEffects: [] });
        this.previewInFlight = this.loadPreview();
      } else {
        const answered = countAnswered(
          this.current.generator,
          this.current.answers,
        );
        this.set({
          phase: "prompting",
          activeQuestion: effect,
          step: answered + 1,
          total: countApplicable(this.current.generator, this.current.answers),
        });
      }
    });
  }

  /**
   * Fill the confirm gate's preview pane with the HONEST plan.
   *
   * `runPreview` reads the real filesystem (through a virtual write overlay, so
   * a step sees what the step before it planned) and records writes without
   * performing them — the gate is shown BEFORE the user consents, so it must
   * not touch the disk, and it must not lie about what will happen. The mock it
   * replaces answered every read with a placeholder and `Exists` with `true`,
   * so the pane could promise files a run would never reach.
   *
   * Failure shows an EMPTY pane rather than a fictional one: the generator's
   * own error belongs to the run, which reports it with its real message, and
   * the decision at the gate stays the user's. A result that arrives after the
   * gate is gone — the user answered or cancelled while the reads were in
   * flight — is dropped, so a slow preview can never repaint a pane the wizard
   * has already left.
   */
  private async loadPreview(): Promise<void> {
    let previewEffects: readonly Effect[] = [];
    try {
      const preview = await runPreview(
        this.current.generator.generate(this.current.answers),
        { cwd: this.cwd },
      );
      previewEffects = preview.effects;
    } catch {
      previewEffects = [];
    }
    // Stale once the gate is no longer both showing AND unanswered. The phase
    // check alone stopped covering the second half when submitConfirm began
    // deferring the executing transition on this very promise: consent clears
    // `pending` immediately but flips the phase only after this settles, so a
    // result landing in that window would repaint a pane already answered.
    if (this.current.phase !== "confirming" || this.pending === undefined) {
      return;
    }
    this.set({ previewEffects });
  }

  /**
   * Resolves once the confirm gate's preview has been applied (or dropped as
   * stale). The wizard itself never awaits this — the pane repaints when the
   * preview lands, which is the whole point of making it async — but a caller
   * that asserts ON the pane has to synchronise with the real filesystem reads
   * the preview performs, and a wall-clock delay would only be flaky.
   *
   * @returns A promise for the in-flight preview, already resolved when none is.
   */
  previewSettled(): Promise<void> {
    return this.previewInFlight ?? Promise.resolve();
  }

  /** Feed effect start (kept for seam symmetry; progress rides completion). */
  reportEffectStart(_effect: Effect): void {
    // No-op: the live view is driven by reportEffectComplete.
  }

  /**
   * Record a completed effect — and what it cost — for the live progress view.
   * The seam delivers a per-effect `duration`; it is stored, not discarded, so
   * the view can say how long each step took.
   */
  reportEffectComplete(effect: Effect, duration: number): void {
    const timestamp =
      this.executionStart > 0 ? performance.now() - this.executionStart : 0;
    this.set({
      phase: this.current.phase === "cancelled" ? "cancelled" : "executing",
      progress: [...this.current.progress, { effect, timestamp, duration }],
    });
  }

  /** A task log line (kept for parity; not surfaced by the default view). */
  reportLog(_level: LogLevel, _message: string): void {}

  /** Per-step `start` timestamps, so completion can measure wall time. */
  private readonly stepStarts = new Map<string, number>();

  /**
   * Fold a host step report into the live view (see {@link StepProgress}).
   *
   * GATED to the executing phase, unlike {@link reportEffectComplete}: effect
   * callbacks only ever arrive from the real interpreter through the seam, but
   * step reports originate INSIDE the host's task composition, so every
   * interpretation of it fires them — including the confirm gate's own honest
   * preview, which walks the same task before the user has consented. Dropping
   * reports outside `executing` keeps a previewed step from painting itself
   * as work in progress — and the gate is sound only because of the pairing
   * invariant {@link submitConfirm} enforces: `executing` begins strictly
   * AFTER the preview walk has completed (consent is released on
   * `previewSettled()`), so no pre-consent walk can still be emitting once
   * reports are accepted. Testing arrival time alone could not close that —
   * a report says nothing about which walk produced it.
   *
   * The phase gate alone is still not enough: `execute` walks `generate` once
   * more on the MOCK interpreter right after consent — synchronously, to give
   * the outcome summary its file list — so a full set of settled steps arrives
   * (in-phase, near-zero durations) before the real drive begins. Steps run
   * sequentially with per-walk-unique keys, so a `start` for a key that has
   * ALREADY settled can only mean a new interpretation: the board resets and
   * the real walk repaints it with real timings. This is also why the view
   * renders steps in the LIVE region, never under `<Static>` — a static row
   * cannot be taken back, and the mock walk's rows must be.
   */
  reportStep(report: StepReport): void {
    if (this.current.phase !== "executing") return;
    let steps = [...this.current.steps];
    const at = steps.findIndex((step) => step.key === report.key);
    let entry: StepProgress;
    if (report.status === "start") {
      if (at >= 0 && steps[at]?.status !== "running") {
        // A settled key starting again: a fresh walk. Reset the board.
        steps = [];
        this.stepStarts.clear();
      }
      this.stepStarts.set(report.key, performance.now());
      entry = { key: report.key, label: report.label, status: "running" };
    } else {
      const started = this.stepStarts.get(report.key);
      entry = {
        key: report.key,
        label: report.label,
        status: report.status,
        duration: started === undefined ? 0 : performance.now() - started,
      };
    }
    const target = steps.findIndex((step) => step.key === report.key);
    if (target >= 0) steps[target] = entry;
    else steps.push(entry);
    this.set({ steps });
  }

  /** Mark the run complete (the view flashes a completion summary). */
  markComplete(): void {
    if (this.current.phase === "cancelled" || this.current.phase === "error")
      return;
    this.set({ phase: "complete" });
  }

  /** Mark the run failed. */
  markError(error: TaskError): void {
    this.set({ phase: "error", error });
  }

  // ---- view → controller ---------------------------------------------------

  /** The user answered the active (non-confirm) prompt. */
  submitAnswer(value: unknown): void {
    const pending = this.pending;
    if (!pending || pending.isConfirm) return;
    this.pending = undefined;
    this.current = {
      ...this.current,
      answers: {
        ...this.current.answers,
        [pending.effect.question.name]: value,
      },
      activeQuestion: undefined,
    };
    for (const listener of this.listeners) listener();
    pending.resolve(value);
  }

  /**
   * The user answered the confirm gate.
   *
   * Consent does NOT begin execution by itself. The gate's honest preview
   * ({@link loadPreview}) walks the same `generate` the run will, and it is
   * async — a fast Y can land while that walk is still in flight. Entering
   * `executing` at that instant re-opened the gap {@link reportStep}'s phase
   * gate exists to close: the pre-consent walk's late step reports arrived
   * in-phase and were accepted, and one naming a key the real walk had
   * already settled hit the fresh-walk reset and cleared the board mid-run.
   * Step reports carry no walk identity — they are plain closures fired from
   * task continuations — so the sound closure is to ensure NO pre-consent
   * walk survives into the executing phase: consent is released only once
   * {@link previewSettled} resolves, which is `runPreview` COMPLETING its
   * walk (loadPreview catches its failure), not merely having started it.
   * The pane has usually settled long before the user answers, so the
   * deferral is normally one microtask.
   *
   * A cancel that lands while consent waits on the preview rejects the gate
   * here, with the same `GENERATOR_CANCELLED` an at-prompt cancel carries —
   * {@link cancel} cannot reach it, this method already claimed the pending
   * slot — so the task fails cleanly instead of hanging on a prompt that
   * would otherwise never settle.
   */
  submitConfirm(proceed: boolean): void {
    const pending = this.pending;
    if (!pending || !pending.isConfirm) return;
    this.pending = undefined;
    if (!proceed) {
      this.set({ phase: "cancelled" });
      pending.resolve(false);
      return;
    }
    void this.previewSettled().then(() => {
      if (this.current.phase === "cancelled") {
        pending.reject(
          new TaskExecutionError({
            code: GENERATOR_CANCELLED,
            message: "Cancelled.",
          }),
        );
        return;
      }
      this.executionStart = performance.now();
      this.set({ phase: "executing" });
      pending.resolve(true);
    });
  }

  /**
   * The user cancelled (Ctrl-C / escape). Two things must happen, and both are
   * safe to run whether or not a prompt is pending:
   *
   * 1. (H2) Abort the run via `onUserCancel` — a Ctrl-C mid-execution has no
   *    pending prompt to reject, so the abort is what actually stops the
   *    interpreter (its `checkInterrupted` throws `TASK_INTERRUPTED`).
   * 2. (H1) Reject any pending prompt with a `TaskExecutionError` carrying
   *    `GENERATOR_CANCELLED` — NOT a bare `Error`. The interpreter only
   *    preserves a thrown error's `.code` for a `TaskExecutionError`; a bare
   *    Error flattens to `INTERNAL`, which the CLI boundary renders as a scary
   *    "please report this issue" (exit 1). Carrying the code routes an
   *    at-prompt cancel through the same clean "Cancelled." (exit 0) path as
   *    declining the confirm gate. The reject fails the current `Prompt` effect
   *    before the drive loop reaches its next `checkInterrupted`, so it wins
   *    deterministically over the concurrent abort.
   */
  cancel(): void {
    const pending = this.pending;
    this.pending = undefined;
    this.onUserCancel?.();
    this.set({ phase: "cancelled" });
    pending?.reject(
      new TaskExecutionError({
        code: GENERATOR_CANCELLED,
        message: "Cancelled.",
      }),
    );
  }
}
