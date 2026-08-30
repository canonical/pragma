/**
 * The dynamic-import target that stands up the Ink render.
 *
 * `inkPrompt` reaches this module ONLY via `await import("./ink/mount.js")` on
 * the first `Prompt` effect — this is THE boundary that keeps `ink`/`react` out
 * of summon-core's static graph. It wires one {@link SessionController} to one
 * persistent Ink render (on stderr, so stdout carries only the machine/plain
 * result the kernel prints after the run) and returns the seam handle.
 */

import type { Effect, LogLevel } from "@canonical/task";
import { render } from "ink";
import type GeneratorDefinition from "../../types/GeneratorDefinition.js";
import type { InkPromptOptions, StepReport } from "../inkPrompt.js";
import type { PromptEffect } from "../types.js";
import { SessionController } from "./session.js";
import { Wizard } from "./Wizard.js";

/** The seam handle a mounted session exposes back to {@link inkPrompt}. */
export interface MountedSession {
  answerPrompt: (effect: PromptEffect) => Promise<unknown>;
  reportEffectStart: (effect: Effect) => void;
  reportEffectComplete: (effect: Effect, duration: number) => void;
  reportLog: (level: LogLevel, message: string) => void;
  reportStep: (report: StepReport) => void;
  dispose: () => Promise<void>;
}

/**
 * Mount the wizard for a generator and return its seam handle.
 *
 * @param generator - The generator being run.
 * @param options - The abort signal.
 * @returns The {@link MountedSession} the prompt handler and effect callbacks drive.
 * @note Impure — renders an Ink app to stderr and reads stdin.
 */
export function mountPromptSession(
  generator: GeneratorDefinition,
  options: InkPromptOptions = {},
): MountedSession {
  // Thread the run's cancel (H2): an in-Ink Ctrl-C/escape calls
  // controller.cancel(), which invokes this to abort the interpreter. `cwd` is
  // the write root the confirm gate's preview reads against, so the pane shows
  // the plan for the tree the run will actually write into.
  const controller = new SessionController(
    generator,
    options.onCancel,
    options.cwd,
    options.initialAnswers,
  );
  const instance = render(<Wizard controller={controller} />, {
    stdout: process.stderr as unknown as NodeJS.WriteStream,
    stdin: process.stdin,
    exitOnCtrlC: false,
  });

  const { signal } = options;
  const onAbort = (): void => controller.cancel();
  signal?.addEventListener("abort", onAbort);

  let disposal: Promise<void> | undefined;
  return {
    answerPrompt: (effect) => controller.request(effect),
    reportEffectStart: (effect) => controller.reportEffectStart(effect),
    reportEffectComplete: (effect, duration) =>
      controller.reportEffectComplete(effect, duration),
    reportLog: (level, message) => controller.reportLog(level, message),
    reportStep: (report) => controller.reportStep(report),
    dispose: () => {
      // MEMOIZED, not boolean-guarded: every caller — however many, however
      // concurrent — gets THE one disposal. A guard that returned early made
      // a second concurrent dispose() resolve BEFORE the first had flushed
      // the final frame, which breaks the contract awaiting dispose() exists
      // for: a caller could print into a still-mounted UI.
      disposal ??= (async () => {
        controller.markComplete();
        signal?.removeEventListener("abort", onAbort);
        // Let React COMMIT the state just reported (markComplete, and a run's
        // last effect/step — its scheduler commits on a macrotask) before the
        // unmount flushes the final frame. Unmounting in the same continuation
        // flushed the previously committed tree, so the last row of a run was
        // permanently painted as still in progress.
        await new Promise((resolve) => setImmediate(resolve));
        instance.unmount();
      })();
      return disposal;
    },
  };
}
