/**
 * PROTECTED: the embedded #819 wizard renders the full flow — prompt sequence
 * → preview/confirm → completion — against a seam-backed
 * {@link SessionController}, exercised with ink-testing-library.
 *
 * Two layers, split on purpose:
 * - the FLOW test drives phase transitions through the controller API (no
 *   fake-TTY input at all), so what it protects — that every phase renders
 *   correctly — is deterministic;
 * - the KEYBOARD-BINDING tests each render one prompt and send the fewest
 *   keystrokes that prove the component→controller wiring. Renders are
 *   sequential and unmounted between tests (Ink's reconciler is a
 *   process-global; overlapping live instances can stall frames), and a
 *   dropped write can only cost a resend inside its own test — the old
 *   monolithic keystroke drive let one dropped write wedge every later
 *   phase, which was a recurring CI-only flake.
 *
 * Controller-only cancellation semantics are covered in session.test.ts.
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

/**
 * Poll a predicate until true (robust to render timing under coverage/load).
 * `describe` is appended to the timeout error so a CI-only failure shows the
 * state the wizard was actually wedged in, not just that it timed out.
 */
async function waitFor(
  check: () => boolean,
  timeout = 30000,
  describe?: () => string,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (check()) return;
    await new Promise((r) => setTimeout(r, 15));
  }
  throw new Error(
    `waitFor: condition not met within timeout${describe ? `\n${describe()}` : ""}`,
  );
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
  describe?: () => string,
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
  throw new Error(
    `pressUntil(${JSON.stringify(key)}): key did not take effect within timeout${describe ? `\n${describe()}` : ""}`,
  );
}

/**
 * Type a text value deterministically. Re-sending a multi-character value
 * (the pressUntil strategy) is not safe for text: a partially-dropped first
 * write followed by a full re-send still satisfies an `includes` check but
 * leaves the field garbled, and the later submit wait then hangs to its
 * ceiling. Instead: prove the input subscription is live with a sentinel
 * keystroke, clear it, then send the whole value as one atomic chunk —
 * reliable once the subscription is known to be up.
 */
async function typeExactly(
  stdin: { write: (data: string) => void },
  frame: () => string,
  value: string,
  describe?: () => string,
): Promise<void> {
  await pressUntil(stdin, "@", () => frame().includes("@"), 30000, describe);
  // Clear however many sentinels landed. Control keys must go one write per
  // keystroke — ink parses key flags per chunk, so a chunk of backspaces is
  // not N backspaces.
  for (let i = 0; i < 40 && frame().includes("@"); i++) {
    stdin.write("\x7f");
    await new Promise((r) => setTimeout(r, 5));
  }
  await waitFor(() => !frame().includes("@"), 30000, describe);
  stdin.write(value);
  await waitFor(() => frame().includes(value), 30000, describe);
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
  // The flow is driven through the CONTROLLER API, not fake-TTY keystrokes:
  // what this test protects is that every phase RENDERS correctly against the
  // real SessionController (step counters, honest preview pane, progress,
  // completion), and that contract is deterministic. Keystroke→handler wiring
  // is covered one binding per render in the suite below — the old monolithic
  // keystroke drive let a single dropped write wedge every later phase, which
  // is exactly the CI flake this split retires.
  it("renders prompt sequence → preview/confirm → completion", async () => {
    const c = new SessionController(gen);
    const { lastFrame, unmount } = render(<Wizard controller={c} />);
    const frame = (): string => lastFrame() ?? "";
    try {
      await waitFor(() => frame().includes("component/react"));

      // 1. Text prompt with a step counter.
      const first = c.request(text("componentPath", "Component path:"));
      await waitFor(
        () =>
          frame().includes("Component path:") &&
          frame().includes("Step 1 of 2"),
      );
      c.submitAnswer("src/components/Button");
      await expect(first).resolves.toBe("src/components/Button");

      // 2. Confirm prompt advances the step counter.
      const second = c.request(confirm("withStyles", "Include styles?"));
      await waitFor(() => frame().includes("Step 2 of 2"));
      c.submitAnswer(true);
      await expect(second).resolves.toBe(true);

      // 3. The confirm GATE — the wizard shows the honest preview + "Proceed?".
      const gated = c.request(gate());
      await waitFor(() => frame().includes("Proceed?"));
      await c.previewSettled();
      await waitFor(() => /File.*to create/.test(frame()));
      c.submitConfirm(true);
      await expect(gated).resolves.toBe(true);
      expect(c.getSnapshot().phase).toBe("executing");

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
  }, 20000);
});

describe("keyboard bindings (one prompt, one render each)", () => {
  // Each test renders a single prompt and sends the fewest keystrokes that
  // prove the component→controller wiring. Fresh render per test: a dropped
  // write can only ever cost a resend inside that test's own helper, never
  // wedge a later phase. On a timeout the error carries the wedged state —
  // these races have only ever reproduced on loaded CI runners, so the error
  // text is the one diagnostic that comes back from there.
  const describeWedge =
    (c: SessionController, frame: () => string) => (): string => {
      const s = c.getSnapshot();
      return `phase=${s.phase} answers=${JSON.stringify(s.answers)} frame:\n${frame()}`;
    };

  it("text prompt: typed value submits on Enter", async () => {
    const c = new SessionController(gen);
    const { lastFrame, stdin, unmount } = render(<Wizard controller={c} />);
    const frame = (): string => lastFrame() ?? "";
    const wedged = describeWedge(c, frame);
    try {
      void c.request(text("componentPath", "Component path:"));
      await waitFor(() => frame().includes("Component path:"), 30000, wedged);
      await typeExactly(stdin, frame, "src/components/Button", wedged);
      await pressUntil(
        stdin,
        "\r",
        () => c.getSnapshot().answers.componentPath === "src/components/Button",
        30000,
        wedged,
      );
    } finally {
      unmount();
    }
  }, 40000);

  it("confirm prompt: 'y' submits true", async () => {
    const c = new SessionController(gen);
    const { lastFrame, stdin, unmount } = render(<Wizard controller={c} />);
    const frame = (): string => lastFrame() ?? "";
    const wedged = describeWedge(c, frame);
    try {
      void c.request(confirm("withStyles", "Include styles?"));
      await waitFor(() => frame().includes("Include styles?"), 30000, wedged);
      await pressUntil(
        stdin,
        "y",
        () => c.getSnapshot().answers.withStyles === true,
        30000,
        wedged,
      );
    } finally {
      unmount();
    }
  }, 40000);

  it("the gate: 'y' proceeds to executing", async () => {
    const c = new SessionController(gen, undefined, undefined, {
      componentPath: "src/components/Button",
      withStyles: true,
    });
    const { lastFrame, stdin, unmount } = render(<Wizard controller={c} />);
    const frame = (): string => lastFrame() ?? "";
    const wedged = describeWedge(c, frame);
    try {
      void c.request(gate());
      await waitFor(() => frame().includes("Proceed?"), 30000, wedged);
      await pressUntil(
        stdin,
        "y",
        () => c.getSnapshot().phase === "executing",
        30000,
        wedged,
      );
    } finally {
      unmount();
    }
  }, 40000);
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
