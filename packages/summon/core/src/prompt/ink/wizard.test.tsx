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
import { describe, expect, it } from "vitest";
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
async function waitFor(check: () => boolean, timeout = 15000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (check()) return;
    await new Promise((r) => setTimeout(r, 15));
  }
  throw new Error("waitFor: condition not met within timeout");
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
      stdin.write("src/components/Button");
      await new Promise((r) => setTimeout(r, 30));
      stdin.write("\r");
      await waitFor(
        () => c.getSnapshot().answers.componentPath === "src/components/Button",
      );

      // 2. Confirm prompt (submits immediately on "y").
      void c.request(confirm("withStyles", "Include styles?"));
      await waitFor(() => frame().includes("Step 2 of 2"));
      stdin.write("y");
      await waitFor(() => c.getSnapshot().answers.withStyles === true);

      // 3. The confirm GATE — the wizard shows the preview + "Proceed?".
      void c.request(gate());
      await waitFor(
        () => frame().includes("Proceed?") && /File.*to create/.test(frame()),
      );
      stdin.write("y");
      await waitFor(() => c.getSnapshot().phase === "executing");

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
