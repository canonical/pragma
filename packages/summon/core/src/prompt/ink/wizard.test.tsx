/**
 * PROTECTED: the embedded #819 wizard renders the full flow — prompt sequence
 * → preview/confirm → completion — against a seam-backed
 * {@link SessionController}, exercised with ink-testing-library.
 *
 * Two layers, split on purpose:
 * - the FLOW test drives phase transitions through the controller API (no
 *   fake-TTY input at all), so what it protects — that every phase renders
 *   correctly — is deterministic;
 * - the KEYBOARD-BINDING tests each render one prompt and drive it with one
 *   idempotent keystroke, proving the component→controller wiring. Renders
 *   are sequential and unmounted between tests (Ink's reconciler is a
 *   process-global; overlapping live instances can stall frames). The fake
 *   stdin can deliver writes LATE under load, so no test sends input whose
 *   duplicate or delayed arrival changes state — the old monolithic
 *   keystroke drive typed multi-character values, and one late-arriving
 *   duplicate garbled the field and wedged every later phase, which was a
 *   recurring CI-only flake.
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

// ---- timing model -----------------------------------------------------------
// One source of truth; every other duration is derived from it, so the
// invariants hold by construction instead of by keeping literals in sync.

/** Poll cadence for frame/state checks. */
const POLL_INTERVAL_MS = 15;

/**
 * One polling window for a single frame/state wait. The passing path settles
 * in milliseconds; this width only bounds how long a genuine wedge waits
 * before reporting. Wide, because loaded CI runners are the only place the
 * wedges have ever fired.
 */
const WAIT_WINDOW_MS = 30_000;

/**
 * Re-send a keystroke after this long without visible effect. Long enough
 * that the common fast path stays single-shot, short enough to retry several
 * times inside one window.
 */
const RESEND_AFTER_MS = WAIT_WINDOW_MS / 30;

/**
 * Per-test budget: strictly wider than the sum of the most helper windows any
 * one test can burn before its first throw (one slow-but-passing wait plus
 * one expiring wait — a throw ends the test, so windows past the second are
 * unreachable). This guarantees a wedge always surfaces as the helpers'
 * diagnostic error (phase, answers, frame), never as vitest's
 * information-free test timeout.
 */
const TEST_BUDGET_MS = 2 * WAIT_WINDOW_MS + WAIT_WINDOW_MS / 3;

/**
 * Poll a predicate until true (robust to render timing under coverage/load).
 * `describe` is appended to the timeout error so a CI-only failure shows the
 * state the wizard was actually wedged in, not just that it timed out.
 */
async function waitFor(
  check: () => boolean,
  describe?: () => string,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < WAIT_WINDOW_MS) {
    if (check()) return;
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  throw new Error(
    `waitFor: condition not met within ${WAIT_WINDOW_MS}ms${describe ? `\n${describe()}` : ""}`,
  );
}

/**
 * Send a key and re-send it until the expected state lands. ink-testing-library
 * can deliver a write late (after the target's `useInput` handler subscribes),
 * so only IDEMPOTENT keys may be sent this way — a late duplicate must be a
 * no-op. Re-sending only after {@link RESEND_AFTER_MS} of no change keeps the
 * common fast path single-shot.
 */
async function pressUntil(
  stdin: { write: (data: string) => void },
  key: string,
  done: () => boolean,
  describe?: () => string,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < WAIT_WINDOW_MS) {
    if (done()) return;
    stdin.write(key);
    const sent = Date.now();
    while (Date.now() - sent < RESEND_AFTER_MS && !done()) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }
  }
  if (done()) return;
  throw new Error(
    `pressUntil(${JSON.stringify(key)}): key did not take effect within ${WAIT_WINDOW_MS}ms${describe ? `\n${describe()}` : ""}`,
  );
}

const text = (
  name: string,
  message: string,
  defaultValue?: string,
): PromptEffect =>
  promptEffect({
    type: "text",
    name,
    message,
    default: defaultValue,
  }) as PromptEffect;
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
  // keystroke drive let one late-delivered write corrupt the field and wedge
  // every later phase, which is exactly the CI flake this split retires.
  it(
    "renders prompt sequence → preview/confirm → completion",
    async () => {
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
    },
    TEST_BUDGET_MS,
  );
});

describe("keyboard bindings (one prompt, one render each)", () => {
  // Each test renders a single prompt and drives it with ONE IDEMPOTENT
  // keystroke. The fake stdin does not lose writes — it can deliver them LATE
  // (a CI diagnostic caught a probe character landing after its verification
  // window and corrupting the field), so no test may send input whose
  // duplicate or late arrival changes state: the text prompt submits its
  // seeded default with bare Enter rather than typing, and y/Enter re-sends
  // are no-ops once the prompt has resolved. On a timeout the error carries
  // the wedged state — these races have only ever reproduced on loaded CI
  // runners, so the error text is the one diagnostic that comes back. The
  // outer test budget (70s) sits above both sequential 30s helper windows,
  // so a wedge always surfaces as that diagnostic error, never as vitest's
  // generic test timeout.
  const describeWedge =
    (c: SessionController, frame: () => string) => (): string => {
      const s = c.getSnapshot();
      return `phase=${s.phase} answers=${JSON.stringify(s.answers)} frame:\n${frame()}`;
    };

  it(
    "text prompt: Enter submits the seeded value",
    async () => {
      const c = new SessionController(gen);
      const { lastFrame, stdin, unmount } = render(<Wizard controller={c} />);
      const frame = (): string => lastFrame() ?? "";
      const wedged = describeWedge(c, frame);
      try {
        void c.request(
          text("componentPath", "Component path:", "src/components/Button"),
        );
        await waitFor(() => frame().includes("Component path:"), wedged);
        await pressUntil(
          stdin,
          "\r",
          () =>
            c.getSnapshot().answers.componentPath === "src/components/Button",
          wedged,
        );
      } finally {
        unmount();
      }
    },
    TEST_BUDGET_MS,
  );

  it(
    "confirm prompt: 'y' submits true",
    async () => {
      const c = new SessionController(gen);
      const { lastFrame, stdin, unmount } = render(<Wizard controller={c} />);
      const frame = (): string => lastFrame() ?? "";
      const wedged = describeWedge(c, frame);
      try {
        void c.request(confirm("withStyles", "Include styles?"));
        await waitFor(() => frame().includes("Include styles?"), wedged);
        await pressUntil(
          stdin,
          "y",
          () => c.getSnapshot().answers.withStyles === true,
          wedged,
        );
      } finally {
        unmount();
      }
    },
    TEST_BUDGET_MS,
  );

  it(
    "the gate: 'y' proceeds to executing",
    async () => {
      const c = new SessionController(gen, undefined, undefined, {
        componentPath: "src/components/Button",
        withStyles: true,
      });
      const { lastFrame, stdin, unmount } = render(<Wizard controller={c} />);
      const frame = (): string => lastFrame() ?? "";
      const wedged = describeWedge(c, frame);
      try {
        void c.request(gate());
        await waitFor(() => frame().includes("Proceed?"), wedged);
        await pressUntil(
          stdin,
          "y",
          () => c.getSnapshot().phase === "executing",
          wedged,
        );
      } finally {
        unmount();
      }
    },
    TEST_BUDGET_MS,
  );
});

describe("cancelled frame is truthful about files written (H2)", () => {
  // These render an ALREADY-cancelled controller — a single static frame, no
  // interactive input loop — so they don't hit the one-live-render caveat above.
  it(
    "counts the completed write-like effects when some were written",
    async () => {
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
    },
    TEST_BUDGET_MS,
  );

  it(
    "says no files were written when the cancel landed before any write",
    async () => {
      const c = new SessionController(gen);
      c.cancel();
      const { lastFrame, unmount } = render(<Wizard controller={c} />);
      try {
        await waitFor(() => (lastFrame() ?? "").includes("Cancelled."));
        expect(lastFrame()).toContain("No files were written.");
      } finally {
        unmount();
      }
    },
    TEST_BUDGET_MS,
  );
});

describe("degenerate-choice prompt wiring (C4)", () => {
  // Neither case drives stdin: the select auto-resolves on mount via its own
  // effect, and the empty multiselect is a static error frame. Both therefore
  // stay clear of the one-live-INTERACTIVE-render caveat above (like the
  // cancelled-frame renders), so they can each stand up their own render.
  it(
    "auto-resolves a forced single-choice select exactly once, with no keystroke and no loop",
    async () => {
      const c = new SessionController(gen);
      const submitSpy = vi.spyOn(c, "submitAnswer");
      const { lastFrame, unmount } = render(<Wizard controller={c} />);
      const frame = (): string => lastFrame() ?? "";
      try {
        await waitFor(() => frame().includes("component/react"));
        void c.request(
          select("framework", "Framework:", [
            { label: "React", value: "react" },
          ]),
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
    },
    TEST_BUDGET_MS,
  );

  it(
    "renders a clear error for a zero-choice multiselect instead of a silent dead-end",
    async () => {
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
    },
    TEST_BUDGET_MS,
  );
});
