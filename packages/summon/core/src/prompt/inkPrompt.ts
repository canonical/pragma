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

/** Options for the Ink session (currently just the abort signal). */
export interface InkPromptOptions {
  /** Abort signal — tears the session down when the run is cancelled. */
  readonly signal?: AbortSignal;
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
  /** Tear down the Ink render. Safe to call more than once. */
  readonly dispose: () => void;
}

/** The handle {@link mountPromptSession} returns (in `./ink/mount.js`). */
interface MountedSession {
  answerPrompt: (effect: PromptEffect) => Promise<unknown>;
  reportEffectStart: (effect: Effect) => void;
  reportEffectComplete: (effect: Effect, duration: number) => void;
  reportLog: (level: LogLevel, message: string) => void;
  dispose: () => void;
}

/**
 * Build the interactive Ink session for a generator.
 *
 * The Ink render is not created until the first `Prompt` effect arrives (which
 * dynamically imports the React UI), so picking this strategy on a fast path
 * that never prompts costs nothing and loads no React.
 *
 * @param generator - The generator being run (the session dry-runs it to build
 *   the confirm gate's preview).
 * @param options - The abort signal.
 * @returns The {@link InkSession} the `create` verb wires into `runtime.exec`.
 */
export default function inkPrompt(
  generator: GeneratorDefinition,
  options: InkPromptOptions = {},
): InkSession {
  let mountP: Promise<MountedSession> | undefined;
  let mounted: MountedSession | undefined;

  const ensure = (): Promise<MountedSession> => {
    mountP ??= import("./ink/mount.js").then((mod) => {
      mounted = mod.mountPromptSession(generator, options);
      return mounted;
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
    dispose: () => mounted?.dispose(),
  };
}
