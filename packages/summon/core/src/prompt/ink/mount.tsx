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
import type { InkPromptOptions } from "../inkPrompt.js";
import type { PromptEffect } from "../types.js";
import { SessionController } from "./session.js";
import { Wizard } from "./Wizard.js";

/** The seam handle a mounted session exposes back to {@link inkPrompt}. */
export interface MountedSession {
  answerPrompt: (effect: PromptEffect) => Promise<unknown>;
  reportEffectStart: (effect: Effect) => void;
  reportEffectComplete: (effect: Effect, duration: number) => void;
  reportLog: (level: LogLevel, message: string) => void;
  dispose: () => void;
  wasInterrupted: () => boolean;
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
  const controller = new SessionController(generator);
  const instance = render(<Wizard controller={controller} />, {
    stdout: process.stderr as unknown as NodeJS.WriteStream,
    stdin: process.stdin,
    exitOnCtrlC: false,
  });

  const { signal } = options;
  const onAbort = (): void => controller.cancel();
  signal?.addEventListener("abort", onAbort);

  let disposed = false;
  return {
    answerPrompt: (effect) => controller.request(effect),
    reportEffectStart: (effect) => controller.reportEffectStart(effect),
    reportEffectComplete: (effect, duration) =>
      controller.reportEffectComplete(effect, duration),
    reportLog: (level, message) => controller.reportLog(level, message),
    dispose: () => {
      if (disposed) return;
      disposed = true;
      controller.markComplete();
      signal?.removeEventListener("abort", onAbort);
      instance.unmount();
    },
    wasInterrupted: () => controller.wasInterrupted(),
  };
}
