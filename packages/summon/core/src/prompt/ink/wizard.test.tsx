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
import chalk from "chalk";
import { render } from "ink-testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CONFIRM_ANSWER_KEY } from "../../execute/execute.js";
import type GeneratorDefinition from "../../types/GeneratorDefinition.js";
import type { PromptEffect } from "../types.js";
import {
  MAX_PROGRESS_LINE,
  measureDisplayWidth,
  stripStyles,
} from "./progressWindow.js";
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
 * The base polling window: how long a single frame/state wait may poll before
 * declaring a wedge. The passing path settles in milliseconds; this width
 * only bounds how long a genuine wedge waits before reporting. Wide, because
 * loaded CI runners are the only place the wedges have ever fired. Every
 * other duration in {@link TEST_TIMINGS} derives from it, so the suite's
 * timing invariants hold by construction instead of by keeping literals in
 * sync.
 */
const WAIT_WINDOW_MS = 30_000;

/** The suite's timing model — one base window, everything else derived. */
const TEST_TIMINGS = {
  /** Poll cadence for frame/state checks. */
  pollIntervalMs: 15,
  /** One polling window for a single frame/state wait. */
  waitWindowMs: WAIT_WINDOW_MS,
  /**
   * Re-send a keystroke after this long without visible effect. Long enough
   * that the common fast path stays single-shot, short enough to retry many
   * times inside one window.
   */
  resendAfterMs: WAIT_WINDOW_MS / 30,
  /**
   * Per-test budget: strictly wider than the most helper windows any one test
   * can burn before its first throw (one slow-but-passing wait plus one
   * expiring wait — a throw ends the test, so windows past the second are
   * unreachable). This guarantees a wedge always surfaces as the helpers'
   * diagnostic error (phase, answers, frame), never as vitest's
   * information-free test timeout.
   */
  testBudgetMs: 2 * WAIT_WINDOW_MS + WAIT_WINDOW_MS / 3,
} as const;

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
  while (Date.now() - start < TEST_TIMINGS.waitWindowMs) {
    if (check()) return;
    await new Promise((r) => setTimeout(r, TEST_TIMINGS.pollIntervalMs));
  }
  throw new Error(
    `waitFor: condition not met within ${TEST_TIMINGS.waitWindowMs}ms${describe ? `\n${describe()}` : ""}`,
  );
}

/**
 * Send a key and re-send it until the expected state lands. ink-testing-library
 * can deliver a write late (after the target's `useInput` handler subscribes),
 * so only IDEMPOTENT keys may be sent this way — a late duplicate must be a
 * no-op. Re-sending only after {@link TEST_TIMINGS}.resendAfterMs of no change keeps the
 * common fast path single-shot.
 */
async function pressUntil(
  stdin: { write: (data: string) => void },
  key: string,
  done: () => boolean,
  describe?: () => string,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < TEST_TIMINGS.waitWindowMs) {
    if (done()) return;
    stdin.write(key);
    const sent = Date.now();
    while (Date.now() - sent < TEST_TIMINGS.resendAfterMs && !done()) {
      await new Promise((r) => setTimeout(r, TEST_TIMINGS.pollIntervalMs));
    }
  }
  if (done()) return;
  throw new Error(
    `pressUntil(${JSON.stringify(key)}): key did not take effect within ${TEST_TIMINGS.waitWindowMs}ms${describe ? `\n${describe()}` : ""}`,
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
    TEST_TIMINGS.testBudgetMs,
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
    TEST_TIMINGS.testBudgetMs,
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
    TEST_TIMINGS.testBudgetMs,
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
    TEST_TIMINGS.testBudgetMs,
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
    TEST_TIMINGS.testBudgetMs,
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
    TEST_TIMINGS.testBudgetMs,
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
    TEST_TIMINGS.testBudgetMs,
  );

  it(
    "gives each question its OWN default, even back-to-back with the same widget",
    async () => {
      // A shipped defect, exactly reproduced. Every widget seeds its state from
      // `question.default` with `useState`, which runs on MOUNT — so without a
      // key React reuses one instance across consecutive questions of the same
      // type and the second inherits the first's selection. `pragma setup` asks
      // "which targets" then "configure MCP for which files" and answered the
      // second with the first's row ids: `Invalid --mcp-targets
      // "global:completions"`. A confirm used to sit between them, whose
      // different widget type forced a remount and hid it.
      const c = new SessionController(gen);
      const { lastFrame, unmount } = render(<Wizard controller={c} />);
      const frame = (): string => lastFrame() ?? "";
      try {
        await waitFor(() => frame().includes("component/react"));

        const first = multiselect("targets", "Which targets?", [
          { label: "completions", value: "global:completions" },
          { label: "mcp", value: "global:mcp" },
        ]);
        (first.question as { default?: unknown }).default = [
          "global:completions",
        ];
        void c.request(first);
        await waitFor(() => frame().includes("Which targets?"));
        c.submitAnswer(["global:completions"]);

        const second = multiselect("mcpTargets", "Which files?", [
          { label: "~/.claude.json", value: "/home/u/.claude.json" },
          { label: "~/.gemini.json", value: "/home/u/.gemini.json" },
        ]);
        (second.question as { default?: unknown }).default = [
          "/home/u/.claude.json",
        ];
        void c.request(second);
        await waitFor(() => frame().includes("Which files?"));

        // Assert on the SELECTION MARKERS, not on the values: the widget
        // renders labels, so a frame check for the first question.s values
        // would pass either way — a green test proving nothing, which is the
        // exact failure this suite exists to catch.
        //
        // Correctly remounted, the second question seeds from ITS OWN default
        // and marks `.claude.json` selected. Reusing the instance carries the
        // first question.s set — values that match none of these choices — so
        // every row renders unselected.
        const claude = frame()
          .split("\n")
          .find((line) => line.includes(".claude.json"));
        expect(claude).toBeDefined();
        expect(claude).toContain("◉");
      } finally {
        unmount();
      }
    },
    TEST_TIMINGS.testBudgetMs,
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
    TEST_TIMINGS.testBudgetMs,
  );
});

describe("host step rows replace the effect transcript", () => {
  // A host whose unit of work is coarser than one effect (pragma's `setup`:
  // one step = one configured target spanning a dozen effects) reports steps,
  // and the wizard renders THOSE rows — the effect transcript would render
  // eighteen symlink lines for the row the host calls `skills  9 skills → 2
  // folders`. Rendered from an already-driven controller: a static frame.
  const drive = async (c: SessionController): Promise<void> => {
    const consent = c.request(gate());
    c.submitConfirm(true);
    // Consent is released once the gate's preview walk settles; only then is
    // the session executing — the one phase step reports land in.
    await consent;
  };

  it(
    "renders one row per step — the host's sentence, the shared glyph, the wall time",
    async () => {
      const c = new SessionController(gen);
      await drive(c);
      c.reportStep({
        key: "global:skills",
        label: "skills  9 skills → 2 folders",
        status: "start",
      });
      // The effects the step spans still stream through the seam; with steps
      // present they must NOT paint their own rows.
      c.reportEffectComplete(writeFileEffect("src/a.ts", "x"), 4);
      c.reportStep({
        key: "global:skills",
        label: "skills  9 skills → 2 folders — linked",
        status: "done",
      });
      c.markComplete();
      const { lastFrame, unmount } = render(<Wizard controller={c} />);
      try {
        await waitFor(() => (lastFrame() ?? "").includes("linked"));
        const frame = stripStyles(lastFrame() ?? "");
        expect(frame).toMatch(
          /✓ skills {2}9 skills → 2 folders — linked \(\d+ms\)/,
        );
        expect(frame).not.toContain("Write file:");
        // The host owns its own epilogue (pragma prints its recap after the
        // unmount) — the framework's banner would misname the run.
        expect(frame).not.toContain("Generation complete");
      } finally {
        unmount();
      }
    },
    TEST_TIMINGS.testBudgetMs,
  );

  it(
    "marks a failed step with the failure glyph, keeping completed siblings",
    async () => {
      const c = new SessionController(gen);
      await drive(c);
      c.reportStep({ key: "a", label: "config  ~/.config", status: "start" });
      c.reportStep({
        key: "a",
        label: "config  ~/.config — installed",
        status: "done",
      });
      c.reportStep({ key: "b", label: "lsp  codium", status: "start" });
      c.reportStep({
        key: "b",
        label: "lsp  codium — `bun` is not found",
        status: "failed",
      });
      c.markComplete();
      const { lastFrame, unmount } = render(<Wizard controller={c} />);
      try {
        await waitFor(() => (lastFrame() ?? "").includes("bun"));
        const frame = stripStyles(lastFrame() ?? "");
        expect(frame).toContain("✓ config  ~/.config — installed");
        expect(frame).toContain("✗ lsp  codium — `bun` is not found");
      } finally {
        unmount();
      }
    },
    TEST_TIMINGS.testBudgetMs,
  );

  it(
    "keeps a long step row on ONE line once the duration is appended",
    async () => {
      const c = new SessionController(gen);
      await drive(c);
      const label = `skills  ${"deep/".repeat(30)}skills — linked`;
      c.reportStep({ key: "k", label, status: "start" });
      c.reportStep({ key: "k", label, status: "done" });
      c.markComplete();
      const { lastFrame, unmount } = render(<Wizard controller={c} />);
      try {
        await waitFor(() => (lastFrame() ?? "").includes("skills"));
        // Trimmed: the live region sits inside the wizard's one-column frame
        // padding, which is layout, not row content.
        const line = (lastFrame() ?? "")
          .split("\n")
          .map((l) => stripStyles(l).trim())
          .find((l) => l.startsWith("✓ skills"));
        expect(line).toBeDefined();
        expect(measureDisplayWidth(line ?? "")).toBeLessThanOrEqual(
          MAX_PROGRESS_LINE,
        );
      } finally {
        unmount();
      }
    },
    TEST_TIMINGS.testBudgetMs,
  );
});

/**
 * The two colour states Ink can render the same frame in. Ink styles through
 * `chalk`, and `chalk` decides at import time whether the process's stdout looks
 * like a terminal: a bare `vitest` run gets NO escapes, while a run under a task
 * runner that allocates a pseudo-terminal — which is exactly how CI invokes this
 * suite, via `nx affected -t test` — gets them. That is an accident of the
 * invoking shell, not of the wizard, so these tests PIN it instead of inheriting
 * it: every progress assertion below runs once bare and once styled, and must
 * hold identically in both. Leaving it inherited is what let a row that measured
 * 72 columns locally measure 91 in CI.
 */
const COLOUR_LEVELS = [
  { name: "no colour", level: 0 },
  { name: "16-colour", level: 1 },
] as const;

describe.each(
  COLOUR_LEVELS,
)("progress lines report what each effect cost ($name)", ({ level }) => {
  // Rendered from an ALREADY-complete controller: a single static frame, no
  // input loop (the completed lines live under `<Static>`, which the test
  // renderer captures in the frame alongside the live region).
  //
  // `chalk.level` is a process-global that Ink reads on every render, so it is
  // set per test and restored after — the surrounding suites assert on plain
  // substrings and must keep whatever the environment gave them.
  const inherited = chalk.level;
  afterEach(() => {
    chalk.level = inherited;
  });

  it(
    "prints the duration the seam delivered, in the timed view's spelling",
    async () => {
      chalk.level = level;
      const c = new SessionController(gen);
      // The duration the interpreter measured for this one effect —
      // fractional, as `performance.now()` deltas are, rendered as whole ms.
      c.reportEffectComplete(writeFileEffect("src/a.ts", "x"), 4.6);
      c.markComplete();
      const { lastFrame, unmount } = render(<Wizard controller={c} />);
      try {
        await waitFor(() =>
          (lastFrame() ?? "").includes("Generation complete"),
        );
        // Asserted on the PRINTED characters: styling puts an `ESC[39m`
        // between the glyph and the space, which says nothing about the row.
        expect(stripStyles(lastFrame() ?? "")).toMatch(
          /✓ Write file: src\/a\.ts .*\(5ms\)/,
        );
      } finally {
        unmount();
      }
    },
    TEST_TIMINGS.testBudgetMs,
  );

  it(
    "keeps a long path on ONE row once the duration is appended",
    async () => {
      chalk.level = level;
      const c = new SessionController(gen);
      // A path well past the cap, timed with a four-digit duration: the
      // description is truncated against a budget that already reserves the
      // suffix, so the whole line still fits a single row.
      c.reportEffectComplete(
        writeFileEffect(`${"deep/".repeat(40)}Component.tsx`, "x"),
        1234,
      );
      c.markComplete();
      const { lastFrame, unmount } = render(<Wizard controller={c} />);
      try {
        await waitFor(() =>
          (lastFrame() ?? "").includes("Generation complete"),
        );
        const line = (lastFrame() ?? "")
          .split("\n")
          .find((l) => l.includes("Component.tsx"));
        expect(line).toBeDefined();
        expect(line).toContain("(1234ms)");
        // The cap governs the WHOLE rendered row — `✓ ` prefix, description,
        // gap and suffix — because that is what the terminal has to fit. The
        // cap itself is exact: no tolerance is added for the styling, because
        // styling costs no columns.
        expect(measureDisplayWidth(line ?? "")).toBeLessThanOrEqual(
          MAX_PROGRESS_LINE,
        );
      } finally {
        unmount();
      }
    },
    TEST_TIMINGS.testBudgetMs,
  );
});
