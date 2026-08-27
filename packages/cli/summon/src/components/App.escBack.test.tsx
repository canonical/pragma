/**
 * Esc from the confirm gate re-asks EVERY prompt (the `reasking` design), and
 * the re-asked prompts must be seeded with the answers already collected —
 * not re-initialized from their declared defaults. The defect class: a
 * default-true confirm given explicitly as `--no-with-stories` reached the
 * gate as `false`; esc + Enter then submitted the DECLARED default (`true`),
 * silently overwriting the explicit answer. Rendered with
 * ink-testing-library, driven gate → esc → Enter → gate.
 */

import type { GeneratorDefinition } from "@canonical/summon-core";
import { pure, task } from "@canonical/task";
import { render } from "ink-testing-library";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "./App.js";

/** Every answer set the preview generate was handed, in call order. */
const generateAnswers: Array<Record<string, unknown>> = [];
const fixture: GeneratorDefinition = {
  meta: {
    name: "fixture/esc-back",
    displayName: "esc-back",
    description: "A fixture recording the answers each generate receives",
    version: "0.0.1",
  },
  prompts: [
    {
      name: "withStories",
      type: "confirm",
      message: "Include stories?",
      default: true,
    },
  ],
  generate: (answers) => {
    generateAnswers.push(answers as Record<string, unknown>);
    return task(pure(undefined)).unwrap();
  },
};

const tick = (ms = 25) => new Promise((resolve) => setTimeout(resolve, ms));

/** Poll until a frame satisfies `check`, then return it (App.confirmGate's shape). */
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

describe("App — esc from the confirm gate keeps explicit answers", () => {
  afterEach(() => {
    process.exitCode = undefined;
    generateAnswers.length = 0;
  });

  it("Enter on a re-asked default-true confirm re-submits the explicit false", async () => {
    // The explicit `--no-with-stories` shape: a complete answer set goes
    // straight to the gate (the askMissing suite proves that shape).
    const { lastFrame, stdin, unmount } = render(
      <App generator={fixture} askMissing answers={{ withStories: false }} />,
    );
    await waitForFrame(lastFrame, (frame) => frame.includes("Proceed?"));
    expect(generateAnswers[0]?.withStories).toBe(false);

    // Esc re-opens the wizard with every prompt askable again. Ink attaches
    // its stdin listener asynchronously, so the escape is re-written until
    // the wizard renders (App.confirmGate's remedy). The gate frame also
    // shows the completed "Include stories?" row, so the wizard is detected
    // by its progress header, which only the prompting phase paints.
    await waitForFrame(lastFrame, (frame) => {
      if (frame.includes("Step 1 of 1")) return true;
      stdin.write("\u001B");
      return false;
    });
    // The hint reflects the SEEDED answer (false → `y/N`), not the declared
    // default's `Y/n`.
    expect(lastFrame() ?? "").toContain("(y/N)");

    // Enter accepts what is shown — the explicit false — and returns to the
    // gate; the re-generate must still see it.
    await waitForFrame(lastFrame, (frame) => {
      if (frame.includes("Proceed?")) return true;
      stdin.write("\r");
      return false;
    });
    const last = generateAnswers[generateAnswers.length - 1];
    expect(generateAnswers.length).toBeGreaterThan(1);
    expect(last?.withStories).toBe(false);
    unmount();
  }, 20_000);
});
