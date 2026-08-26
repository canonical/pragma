/**
 * The confirm gate's RE-generate goes through the same `generateTask` choke
 * point as the prompts-complete generate (its second call site): a STATEFUL
 * generator whose `generate` succeeds for the preview and throws on the
 * confirm re-generate must land in the App's error phase — GENERATE_ERROR,
 * exit code 1 — not in Ink's error boundary (a crash box that owns no exit
 * code: the silent-success class parity-contract §3 forbids). Rendered with
 * ink-testing-library, driven to `Proceed?` and confirmed with `y`.
 */

import type { GeneratorDefinition } from "@canonical/summon-core";
import { pure, task } from "@canonical/task";
import { render } from "ink-testing-library";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "./App.js";

let generateCalls = 0;
const stateful: GeneratorDefinition = {
  meta: {
    name: "fixture/stateful",
    displayName: "stateful",
    description: "A fixture that only survives its first generate",
    version: "0.0.1",
  },
  prompts: [{ name: "title", type: "text", message: "Title:", default: "t" }],
  generate: () => {
    generateCalls += 1;
    if (generateCalls > 1) {
      throw new Error("second generate exploded");
    }
    return task(pure(undefined)).unwrap();
  },
};

const tick = (ms = 25) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Poll until a frame satisfies `check`, then return it.
 *
 * The confirm gate is NOT the mount commit — it is the tail of an async chain
 * (`PromptSequence`'s `onComplete` -> `handlePromptsComplete` -> `generateTask`
 * -> `setState({phase:"confirming"})`). A single fixed tick can therefore read a
 * frame the gate has not painted yet, which is exactly what happened under
 * suite parallelism: 2 failures in 84 loaded runs, 0 in 30 unloaded, and
 * 216/216 when the file ran alone — i.e. visible only in the condition CI runs
 * in. Lifted from `summon-core`'s `wizard.test.tsx`.
 */
const waitForFrame = async (
  read: () => string | undefined,
  check: (frame: string) => boolean,
  timeout = 15_000,
): Promise<string> => {
  const deadline = Date.now() + timeout;
  let frame = read() ?? "";
  while (!check(frame) && Date.now() < deadline) {
    await tick(15);
    frame = read() ?? "";
  }
  return frame;
};


describe("App — the confirm gate's re-generate lands in the error phase", () => {
  // The error phase sets process.exitCode; never leak it across cases (or
  // into the worker's own exit).
  afterEach(() => {
    process.exitCode = undefined;
    generateCalls = 0;
  });

  it("a generate that throws only at the gate renders GENERATE_ERROR, exit code 1", async () => {
    // A complete answer set goes straight to the gate (the askMissing suite
    // proves that shape); the FIRST generate — the preview's — succeeds.
    const { lastFrame, stdin, unmount } = render(
      <App generator={stateful} askMissing answers={{ title: "Widget" }} />,
    );
    expect(
      await waitForFrame(lastFrame, (frame) => frame.includes("Proceed?")),
    ).toContain("Proceed?");
    expect(generateCalls).toBe(1);

    // Confirming re-generates; the second call throws — the one path that
    // could bypass both the choke point and handleExecutionError. Ink
    // attaches its stdin listener asynchronously in a fresh worker
    // (measured: one 25ms tick is not always enough when the app goes
    // STRAIGHT to the gate), so the `y` is re-written until the gate takes
    // it — extra writes are harmless: each accepted `y` re-runs the same
    // throwing re-generate, and once the error phase renders, gate input
    // is inactive.
    // The exit code is owned by a passive effect (App.tsx:996) that flushes
    // AFTER the commit painting the error, so a loop exiting on the FRAME alone
    // can read a rendered message and a still-unset exitCode. Wait for the
    // settled PAIR — the remedy `App.invalidAnswer.test.tsx` already took, in
    // the file it copied this shape from. Measured on the real package: 4 of 8
    // runs failed here under contention, every failure the code, never the frame.
    const settled = () =>
      (lastFrame() ?? "").includes("Code: GENERATE_ERROR") &&
      process.exitCode !== undefined;
    const deadline = Date.now() + 15_000;
    while (!settled() && Date.now() < deadline) {
      stdin.write("y");
      await tick(50);
    }
    const frame = lastFrame() ?? "";
    expect(frame).toContain("✗ Error: second generate exploded");
    expect(frame).toContain("Code: GENERATE_ERROR");
    // The error phase, not the raw throw: no stack frames in the frame.
    expect(frame).not.toContain("at generate");
    expect(process.exitCode).toBe(1);
    unmount();
  }, 20_000);
});
