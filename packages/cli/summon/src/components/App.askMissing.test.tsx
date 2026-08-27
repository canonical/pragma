/**
 * The wizard asks exactly `pendingPrompts(prompts, explicit)` (A9): with
 * `askMissing`, explicitly provided answers are pre-seeded — shown as
 * completed, never re-asked — and only the missing prompts are asked, in
 * declared order, with conditional prompts unlocked by the answers as they
 * land. Rendered with ink-testing-library against the real App.
 */

import type { GeneratorDefinition } from "@canonical/summon-core";
import { pure, task } from "@canonical/task";
import { render } from "ink-testing-library";
import { describe, expect, it } from "vitest";
import { App } from "./App.js";

const generator: GeneratorDefinition = {
  meta: {
    name: "fixture/widget",
    displayName: "widget",
    description: "A fixture widget",
    version: "0.0.1",
  },
  prompts: [
    { name: "title", type: "text", message: "Title:", default: "t" },
    {
      name: "withStories",
      type: "confirm",
      message: "Include stories?",
      default: true,
    },
    {
      name: "useTsStories",
      type: "confirm",
      message: "Use TypeScript stories?",
      default: false,
      when: (answers) => answers.withStories === true,
    },
  ],
  generate: () => task(pure(undefined)).unwrap(),
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

describe("App askMissing — the wizard asks only the pending prompts", () => {
  it("shows provided answers as completed and asks the first missing prompt", async () => {
    const { lastFrame, unmount } = render(
      <App generator={generator} askMissing answers={{ title: "Widget" }} />,
    );
    await tick();
    const frame = lastFrame() ?? "";
    // The provided answer is in the completed table…
    expect(frame).toContain("Title:");
    expect(frame).toContain("Widget");
    // …and the first PENDING prompt is being asked, not Title again. (The
    // conditional third prompt joins the count only once stories are on.)
    expect(frame).toContain("Include stories?");
    expect(frame).toContain("Step 1 of 1");
    unmount();
  }, 20_000);

  it("an answer unlocks a conditional prompt (collectAnswers parity)", async () => {
    const { lastFrame, stdin, unmount } = render(
      <App generator={generator} askMissing answers={{ title: "Widget" }} />,
    );
    await tick();
    stdin.write("y"); // Include stories? -> yes
    // The wizard's handler IS attached by the time this lands (measured: 0
    // lost in 72 runs, idle and under load) — but the unlocked prompt can
    // paint LATE, past one 25ms tick. So poll for the frame rather than
    // guessing a tick, and do NOT re-write the `y`: unlike the esc below it
    // is not idempotent — a second one would answer the prompt it unlocked.
    const deadline = Date.now() + 15_000;
    while (
      !(lastFrame() ?? "").includes("Use TypeScript stories?") &&
      Date.now() < deadline
    ) {
      await tick();
    }
    expect(lastFrame()).toContain("Use TypeScript stories?");
    unmount();
  }, 20_000);

  it("a fully-provided answer set goes straight to the confirm gate", async () => {
    const { lastFrame, unmount } = render(
      <App
        generator={generator}
        askMissing
        answers={{ title: "Widget", withStories: false }}
      />,
    );
    const frame = await waitForFrame(lastFrame, (f) => f.includes("Proceed?"));
    expect(frame).toContain("Proceed?");
    expect(frame).not.toContain("Step 1");
    unmount();
  }, 20_000);

  it("esc at the gate re-opens the wizard even when nothing was pending (regression)", async () => {
    // A fully-explicit invocation goes straight to the gate; the gate
    // advertises `esc to go back`, and going back must ASK — with the
    // provided seed kept, the empty pending set would auto-complete straight
    // back to the gate, a silent no-op. On esc the seed is cleared: every
    // prompt is asked again, previous values pre-filled.
    const { lastFrame, stdin, unmount } = render(
      <App
        generator={generator}
        askMissing
        answers={{ title: "Widget", withStories: false }}
      />,
    );
    expect(
      await waitForFrame(lastFrame, (frame) => frame.includes("Proceed?")),
    ).toContain("Proceed?");
    // Same rule as App.confirmGate.test.tsx:55-70, same shape: Ink attaches
    // its stdin listener asynchronously in a fresh worker (measured here: a
    // cold worker's first render loses the esc outright — 5 of 72 — and no
    // amount of waiting recovers one), so the esc is re-written until the
    // gate lets go. Extra escapes are harmless — measured: the re-opened
    // wizard sits at step 1 with an empty history, so a redundant esc exits
    // the App without disturbing the frame asserted below.
    const deadline = Date.now() + 15_000;
    while (
      !(lastFrame() ?? "").includes("Step 1 of 2") &&
      Date.now() < deadline
    ) {
      stdin.write("\u001B"); // esc
      await tick(50);
    }
    const frame = lastFrame() ?? "";
    expect(frame).toContain("Step 1 of 2");
    expect(frame).toContain("Title:");
    // The PRE-FILL, which is the behaviour the comment above promises and
    // nothing here pinned: `Title:` is the active prompt's MESSAGE and renders
    // whether or not a value carried over. The carried value renders beneath
    // it. The round-22 review proved this by break + control — setting
    // `initialAnswers={undefined}` left this cell green until this line existed.
    expect(frame).toContain("Widget");
    expect(frame).not.toContain("Proceed?");
    unmount();
  }, 20_000);
});
