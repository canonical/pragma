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
  dryRun,
  type Effect,
  type LogLevel,
  type TaskError,
} from "@canonical/task";
import { CONFIRM_ANSWER_KEY } from "../../execute/execute.js";
import type GeneratorDefinition from "../../types/GeneratorDefinition.js";
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
  /** A failure, when `phase === "error"`. */
  readonly error?: TaskError;
}

/** Count the prompts that apply given the answers so far (respecting `when`). */
function countApplicable(
  generator: GeneratorDefinition,
  answers: Record<string, unknown>,
): number {
  return generator.prompts.filter((p) => !p.when || p.when(answers) === true)
    .length;
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

  constructor(generator: GeneratorDefinition) {
    this.current = {
      phase: "idle",
      generator,
      answers: {},
      step: 0,
      total: countApplicable(generator, {}),
      previewEffects: [],
      progress: [],
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
        let previewEffects: Effect[] = [];
        try {
          previewEffects = dryRun(
            this.current.generator.generate(this.current.answers),
          ).effects;
        } catch {
          previewEffects = [];
        }
        this.set({ phase: "confirming", previewEffects });
      } else {
        const answered = Object.keys(this.current.answers).length;
        this.set({
          phase: "prompting",
          activeQuestion: effect,
          step: answered + 1,
          total: countApplicable(this.current.generator, this.current.answers),
        });
      }
    });
  }

  /** Feed effect start (kept for seam symmetry; progress rides completion). */
  reportEffectStart(_effect: Effect): void {
    // No-op: the live view is driven by reportEffectComplete.
  }

  /** Record a completed effect for the live progress view. */
  reportEffectComplete(effect: Effect, _duration: number): void {
    const timestamp =
      this.executionStart > 0 ? performance.now() - this.executionStart : 0;
    this.set({
      phase: this.current.phase === "cancelled" ? "cancelled" : "executing",
      progress: [...this.current.progress, { effect, timestamp }],
    });
  }

  /** A task log line (kept for parity; not surfaced by the default view). */
  reportLog(_level: LogLevel, _message: string): void {}

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

  /** The user answered the confirm gate. */
  submitConfirm(proceed: boolean): void {
    const pending = this.pending;
    if (!pending || !pending.isConfirm) return;
    this.pending = undefined;
    if (proceed) this.executionStart = performance.now();
    this.set({ phase: proceed ? "executing" : "cancelled" });
    pending.resolve(proceed);
  }

  /**
   * The user cancelled (Ctrl-C / escape at a gate). Rejecting the pending
   * answer fails the task straight through the prompt handler — that rejection
   * IS the cancellation signal (no interrupted flag to read back).
   */
  cancel(): void {
    const pending = this.pending;
    this.pending = undefined;
    this.set({ phase: "cancelled" });
    pending?.reject(new Error("Cancelled by user."));
  }
}
