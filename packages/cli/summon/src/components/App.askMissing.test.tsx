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

const tick = () => new Promise((resolve) => setTimeout(resolve, 25));

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
    await tick();
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
    await tick();
    const frame = lastFrame() ?? "";
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
    await tick();
    expect(lastFrame()).toContain("Proceed?");
    stdin.write("\u001B"); // esc
    await tick();
    const frame = lastFrame() ?? "";
    expect(frame).toContain("Step 1 of 2");
    expect(frame).toContain("Title:");
    expect(frame).not.toContain("Proceed?");
    unmount();
  }, 20_000);
});
