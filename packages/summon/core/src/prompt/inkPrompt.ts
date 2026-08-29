/**
 * The interactive Ink prompt strategy — the embedded #819 wizard, seam-backed.
 *
 * CRITICAL (lazy-React discipline): this module's STATIC import graph contains
 * NO JSX and NO `import` of `ink`/`react`. The entire React UI lives under
 * `./ink/**` and is reached ONLY through `await import("./ink/mount.js")` on the
 * first `Prompt` effect. So importing summon-core — or building the pragma
 * command tree, or running `create --yes` (which picks {@link autoPrompt}) —
 * never loads React. The lazy-React guard test enforces this boundary.
 *
 * The session is SESSION-backed, not per-question: one persistent Ink render is
 * stood up on the first prompt and torn down on completion or abort, so it
 * preserves the step-N-of-M header, the live answers table, and the
 * preview/confirm gate across the whole run. The runner feeds it two streams —
 * `Prompt` effects (via `promptHandler`) and effect progress (via
 * `onEffectStart`/`onEffectComplete`/`onLog`) — and it renders both.
 */

import type { Effect, LogLevel } from "@canonical/task";
import type GeneratorDefinition from "../types/GeneratorDefinition.js";
import type { PromptEffect, PromptHandler } from "./types.js";

/** Options for the Ink session: the abort signal and the cancel callback. */
export interface InkPromptOptions {
  /** Abort signal — tears the session down when the run is cancelled. */
  readonly signal?: AbortSignal;
  /**
   * Invoked when the user cancels IN the wizard (Ctrl-C / escape). Threaded to
   * the {@link SessionController} so an in-Ink cancel aborts the run (H2): a
   * Ctrl-C during execution — where Ink's raw mode swallows SIGINT — has no
   * pending prompt, so this callback (wired to the run's `AbortController`) is
   * what stops the interpreter. Distinct from `signal`, which fires the OTHER
   * way (an external abort tears the render down).
   */
  readonly onCancel?: () => void;
  /**
   * The write root the run resolves relative effect paths against — pass the
   * same value the interpreter will receive. The confirm gate's preview reads
   * that tree, so the pane's plan is the plan the run produces. Omitted falls
   * back to the process cwd, matching a run given no `cwd` of its own.
   */
  readonly cwd?: string;
  /**
   * Answers already provided outside the wizard (CLI flags / MCP args).
   * Seeded into the session so the confirm gate's preview and step counter
   * see the full answer set — without this a partially-flagged run previews
   * with those answers missing (`undefined` paths, wrong plan).
   */
  readonly initialAnswers?: Readonly<Record<string, unknown>>;
}

/**
 * One host-named unit of work, reported through {@link InkSession.reportStep}.
 *
 * The wizard's default live progress is the per-effect transcript — the right
 * grain for a scaffolder, whose unit of work IS the file. A host whose unit is
 * coarser (pragma's `setup`, where one step is one configured target spanning
 * a dozen effects) reports its own steps instead, in its own vocabulary, and
 * the view renders those rows in place of the transcript. `label` is the whole
 * row body, unstyled — the glyph, spinner and duration are the view's.
 */
export interface StepReport {
  /** Stable identity — a `start` and its `done`/`failed` share it. */
  readonly key: string;
  /** The row body (unstyled); the completion report may extend it. */
  readonly label: string;
  readonly status: "start" | "done" | "failed";
}

/**
 * A running Ink session's seam surface: the prompt handler plus the effect
 * callbacks the runner wires into `runtime.exec`, and its teardown.
 */
export interface InkSession {
  /** The `promptHandler` the runner interprets `Prompt` effects with. */
  readonly promptHandler: PromptHandler;
  /** Feed effect start into the live progress view (composed after stamping). */
  readonly onEffectStart: (effect: Effect) => void;
  /** Feed effect completion (with timing) into the live progress view. */
  readonly onEffectComplete: (effect: Effect, duration: number) => void;
  /** Feed a task log line into the live view. */
  readonly onLog: (level: LogLevel, message: string) => void;
  /**
   * Report a host-named step ({@link StepReport}). Once any step is reported,
   * the live progress renders the host's step rows INSTEAD of the per-effect
   * transcript; a session that never receives one renders exactly as before.
   */
  readonly reportStep: (report: StepReport) => void;
  /**
   * Tear down the Ink render. Safe to call more than once. Resolves once the
   * final frame is flushed — AWAIT it before printing to the same terminal,
   * or the closing frame and the caller's output interleave.
   */
  readonly dispose: () => Promise<void>;
}

/** The handle {@link mountPromptSession} returns (in `./ink/mount.js`). */
interface MountedSession {
  answerPrompt: (effect: PromptEffect) => Promise<unknown>;
  reportEffectStart: (effect: Effect) => void;
  reportEffectComplete: (effect: Effect, duration: number) => void;
  reportLog: (level: LogLevel, message: string) => void;
  reportStep: (report: StepReport) => void;
  dispose: () => Promise<void>;
}

/**
 * Build the interactive Ink session for a generator.
 *
 * The Ink render is not created until the first `Prompt` effect arrives (which
 * dynamically imports the React UI), so picking this strategy on a fast path
 * that never prompts costs nothing and loads no React.
 *
 * @param generator - The generator being run (the session previews it to build
 *   the confirm gate's plan).
 * @param options - The abort signal, cancel callback, and preview write root.
 * @returns The {@link InkSession} the `create` verb wires into `runtime.exec`.
 */
export default function inkPrompt(
  generator: GeneratorDefinition,
  options: InkPromptOptions = {},
): InkSession {
  let mountP: Promise<MountedSession> | undefined;
  let mounted: MountedSession | undefined;

  const ensure = (): Promise<MountedSession> => {
    mountP ??= import("./ink/mount.js")
      .then((mod) => {
        mounted = mod.mountPromptSession(generator, options);
        return mounted;
      })
      .catch((error) => {
        // Do not cache a failure — a trailing catch, so BOTH a failed dynamic
        // import and a throw from mountPromptSession itself (e.g. Ink render)
        // reset the memo; otherwise every later prompt in the session would
        // reuse the same stale rejection.
        mountP = undefined;
        throw error;
      });
    return mountP;
  };

  // Cancellation propagates by REJECTION: controller.cancel() rejects the
  // pending answer promise, so a declined/aborted run fails the task straight
  // through here — no separate interrupted flag to read.
  const promptHandler: PromptHandler = async (effect) => {
    const session = await ensure();
    return session.answerPrompt(effect);
  };

  return {
    promptHandler,
    onEffectStart: (effect) => mounted?.reportEffectStart(effect),
    onEffectComplete: (effect, duration) =>
      mounted?.reportEffectComplete(effect, duration),
    onLog: (level, message) => mounted?.reportLog(level, message),
    // Steps can only originate from the running task, and the session mounts
    // on the FIRST Prompt effect — which precedes execution (the confirm gate
    // is itself a prompt) — so by the time a step is reported the session
    // exists; the guard only covers a host reporting outside a run.
    reportStep: (report) => mounted?.reportStep(report),
    dispose: async () => {
      await mounted?.dispose();
    },
  };
}
