/**
 * PROTECTED: the embedded #819 wizard renders and drives the full flow —
 * prompt sequence → preview/confirm → completion — through a seam-backed
 * {@link SessionController}, exercised with ink-testing-library.
 *
 * ONE live Ink render per process: Ink's reconciler is a process-global, so a
 * second concurrent/sequential instance in the same worker can stall frames.
 * The whole flow (including a decline at the gate) is therefore driven through a
 * single render, and the controller-only cancellation semantics are covered
 * separately in session.test.ts.
 */

import { promptEffect, writeFile, writeFileEffect } from "@canonical/task";
import { render } from "ink-testing-library";
import { describe, expect, it, vi } from "vitest";
import { CONFIRM_ANSWER_KEY } from "../../execute/execute.js";
import type GeneratorDefinition from "../../types/GeneratorDefinition.js";
import type { PromptEffect } from "../types.js";
import { SessionController } from "./session.js";
import { Wizard } from "./Wizard.js";

const gen: GeneratorDefinition = {
  meta: {
    name: "component/react",
    displayName: "@canonical/summon-component:react",
    description: "Generate a React component",
    version: "0.1.0",
  },
  prompts: [
    { name: "componentPath", type: "text", message: "Component path:" },
    {
      name: "withStyles",
      type: "confirm",
      message: "Include styles?",
      default: true,
    },
  ],
  generate: (a) =>
    writeFile(`${String(a.componentPath)}/index.ts`, "export {};\n"),
};

/** Poll a predicate until true (robust to render timing under coverage/load). */
async function waitFor(check: () => boolean, timeout = 30000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (check()) return;
    await new Promise((r) => setTimeout(r, 15));
  }
  throw new Error("waitFor: condition not met within timeout");
}

/**
 * Send a key and re-send it until the expected state lands. ink-testing-library
 * can drop input written before the target's `useInput` handler subscribes;
 * under CI load that lag makes a single write flaky (the key is lost and the
 * state wait then runs to its ceiling). Re-sending only after ~1s of no change
 * keeps the common fast path single-shot (no double-submit).
 */
async function pressUntil(
  stdin: { write: (data: string) => void },
  key: string,
  done: () => boolean,
  timeout = 30000,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (done()) return;
    stdin.write(key);
    for (let i = 0; i < 50 && !done(); i++) {
      await new Promise((r) => setTimeout(r, 20));
    }
  }
  if (done()) return;
  throw new Error("pressUntil: key did not take effect within timeout");
}

const text = (name: string, message: string): PromptEffect =>
  promptEffect({ type: "text", name, message }) as PromptEffect;
const confirm = (name: string, message: string): PromptEffect =>
  promptEffect({
    type: "confirm",
    name,
    message,
    default: true,
  }) as PromptEffect;
const gate = (): PromptEffect =>
  promptEffect({
    type: "confirm",
    name: CONFIRM_ANSWER_KEY,
    message: "Proceed?",
    default: true,
  }) as PromptEffect;
const select = (
  name: string,
  message: string,
  choices: Array<{ label: string; value: string }>,
): PromptEffect =>
  promptEffect({ type: "select", name, message, choices }) as PromptEffect;
const multiselect = (
  name: string,
  message: string,
  choices: Array<{ label: string; value: string }>,
): PromptEffect =>
  promptEffect({ type: "multiselect", name, message, choices }) as PromptEffect;

describe("create wizard (PROTECTED)", () => {
  it("runs prompt sequence → preview/confirm → completion", async () => {
    const c = new SessionController(gen);
    const { lastFrame, stdin, unmount } = render(<Wizard controller={c} />);
    const frame = (): string => lastFrame() ?? "";
    try {
      await waitFor(() => frame().includes("component/react"));

      // 1. Text prompt with a step counter.
      void c.request(text("componentPath", "Component path:"));
      await waitFor(
        () =>
          frame().includes("Component path:") &&
          frame().includes("Step 1 of 2"),
      );
      // Type the value, re-sending until the frame reflects it — the text write
      // races the useInput subscription just like the keystrokes (a dropped
      // write left the field empty and hung the frame wait under CI load). Then
      // re-send Enter until the answer lands.
      await pressUntil(stdin, "src/components/Button", () =>
        frame().includes("src/components/Button"),
      );
      await pressUntil(
        stdin,
        "\r",
        () => c.getSnapshot().answers.componentPath === "src/components/Button",
      );

      // 2. Confirm prompt (submits immediately on "y").
      void c.request(confirm("withStyles", "Include styles?"));
      await waitFor(() => frame().includes("Step 2 of 2"));
      await pressUntil(
        stdin,
        "y",
        () => c.getSnapshot().answers.withStyles === true,
      );

      // 3. The confirm GATE — the wizard shows the preview + "Proceed?".
      void c.request(gate());
      await waitFor(
        () => frame().includes("Proceed?") && /File.*to create/.test(frame()),
      );
      await pressUntil(stdin, "y", () => c.getSnapshot().phase === "executing");

      // 4. Progress + completion.
      c.reportEffectComplete(
        writeFileEffect("src/components/Button/index.ts", "export {};\n"),
        4,
      );
      c.markComplete();
      await waitFor(() => frame().includes("Generation complete"));
      expect(c.getSnapshot().answers).toMatchObject({
        componentPath: "src/components/Button",
        withStyles: true,
      });
    } finally {
      unmount();
    }
  }, 60000);
});

describe("cancelled frame is truthful about files written (H2)", () => {
  // These render an ALREADY-cancelled controller — a single static frame, no
  // interactive input loop — so they don't hit the one-live-render caveat above.
  it("counts the completed write-like effects when some were written", async () => {
    const c = new SessionController(gen);
    // Two files landed before the user hit Ctrl-C mid-execution.
    c.reportEffectComplete(writeFileEffect("a.ts", "x"), 1);
    c.reportEffectComplete(writeFileEffect("b.ts", "y"), 1);
    c.cancel();
    const { lastFrame, unmount } = render(<Wizard controller={c} />);
    try {
      await waitFor(() => (lastFrame() ?? "").includes("Cancelled."));
      expect(lastFrame()).toContain("2 file(s) were written.");
      expect(lastFrame()).not.toContain("No files were written.");
    } finally {
      unmount();
    }
  }, 20000);

  it("says no files were written when the cancel landed before any write", async () => {
    const c = new SessionController(gen);
    c.cancel();
    const { lastFrame, unmount } = render(<Wizard controller={c} />);
    try {
      await waitFor(() => (lastFrame() ?? "").includes("Cancelled."));
      expect(lastFrame()).toContain("No files were written.");
    } finally {
      unmount();
    }
  }, 20000);
});

describe("degenerate-choice prompt wiring (C4)", () => {
  // Neither case drives stdin: the select auto-resolves on mount via its own
  // effect, and the empty multiselect is a static error frame. Both therefore
  // stay clear of the one-live-INTERACTIVE-render caveat above (like the
  // cancelled-frame renders), so they can each stand up their own render.
  it("auto-resolves a forced single-choice select exactly once, with no keystroke and no loop", async () => {
    const c = new SessionController(gen);
    const submitSpy = vi.spyOn(c, "submitAnswer");
    const { lastFrame, unmount } = render(<Wizard controller={c} />);
    const frame = (): string => lastFrame() ?? "";
    try {
      await waitFor(() => frame().includes("component/react"));
      void c.request(
        select("framework", "Framework:", [{ label: "React", value: "react" }]),
      );
      await waitFor(() => c.getSnapshot().answers.framework === "react");
      // Let any stray effect re-fire settle — it must be a no-op, not a loop.
      await new Promise((r) => setTimeout(r, 60));
      expect(c.getSnapshot().answers.framework).toBe("react");
      expect(submitSpy).toHaveBeenCalledTimes(1);
    } finally {
      submitSpy.mockRestore();
      unmount();
    }
  }, 20000);

  it("renders a clear error for a zero-choice multiselect instead of a silent dead-end", async () => {
    const c = new SessionController(gen);
    const submitSpy = vi.spyOn(c, "submitAnswer");
    const { lastFrame, unmount } = render(<Wizard controller={c} />);
    const frame = (): string => lastFrame() ?? "";
    try {
      await waitFor(() => frame().includes("component/react"));
      void c.request(multiselect("features", "Features:", []));
      await waitFor(() => frame().includes("No options are available"));
      expect(frame()).toContain("Press Escape or Ctrl-C to");
      // The dead-end must not auto-submit an empty answer; only Escape/Ctrl-C
      // may leave it.
      expect(c.getSnapshot().answers.features).toBeUndefined();
      expect(submitSpy).not.toHaveBeenCalled();
    } finally {
      submitSpy.mockRestore();
      unmount();
    }
  }, 20000);
});
