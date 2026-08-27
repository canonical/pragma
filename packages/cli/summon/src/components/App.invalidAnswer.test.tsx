/**
 * A generator-raised typed invalid answer (summon-core's
 * `invalidAnswersError`, code GENERATOR_INVALID_ANSWER — a cross-answer
 * constraint, two answers only valid together; no shipped generator raises
 * one today, so a fixture drives it) renders as the App's clean
 * error phase — message + code, no crash box, no stack — on the run path
 * (pre-filled answers), the same UI every execution failure gets.
 */

import {
  type GeneratorDefinition,
  invalidAnswersError,
} from "@canonical/summon-core";
import { pure, task } from "@canonical/task";
import { render } from "ink-testing-library";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "./App.js";

const guarded: GeneratorDefinition = {
  meta: {
    name: "fixture/guarded",
    displayName: "guarded",
    description: "A guarded fixture",
    version: "0.0.1",
  },
  prompts: [{ name: "ok", type: "confirm", message: "OK?", default: true }],
  generate: (answers) => {
    if ((answers as { ok?: unknown }).ok !== true) {
      throw invalidAnswersError("OK is required — drop --no-ok.");
    }
    return task(pure(undefined)).unwrap();
  },
};

const tick = () => new Promise((resolve) => setTimeout(resolve, 25));

describe("App — a typed invalid answer is the clean error phase, not a crash", () => {
  // The error phase sets process.exitCode; never leak it across cases (or
  // into the worker's own exit).
  afterEach(() => {
    process.exitCode = undefined;
  });

  it("renders the message and its code on the run path, exit code 2", async () => {
    const { lastFrame, unmount } = render(
      <App generator={guarded} preview={false} answers={{ ok: false }} />,
    );
    // The error phase's exit code is owned by a passive effect (App.tsx:996),
    // which flushes AFTER the commit that paints the error — so one fixed
    // tick can read the rendered message and a still-unset exitCode
    // (measured: 4 of 72 runs under load, always the code, never the frame).
    // Poll for the settled pair; a real regression still falls through to the
    // assertions below and fails there, loudly.
    const settled = () =>
      process.exitCode !== undefined &&
      (lastFrame() ?? "").includes("Code: GENERATOR_INVALID_ANSWER");
    const deadline = Date.now() + 15_000;
    while (!settled() && Date.now() < deadline) {
      await tick();
    }
    const frame = lastFrame() ?? "";
    expect(frame).toContain("✗ Error: OK is required — drop --no-ok.");
    expect(frame).toContain("Code: GENERATOR_INVALID_ANSWER");
    // The error phase, not the raw throw: no stack frames in the frame.
    expect(frame).not.toContain("at generate");
    // The usage class of the cross-CLI matrix: a typed invalid answer exits 2
    // in the run/wizard arms too — rendered in the App, never exit 0.
    expect(process.exitCode).toBe(2);
    unmount();
  }, 20_000);
});
