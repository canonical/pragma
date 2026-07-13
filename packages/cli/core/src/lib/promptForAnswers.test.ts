import type { Effect } from "@canonical/task";
import { runTask } from "@canonical/task/node";
import { describe, expect, it } from "vitest";
import promptForAnswers, { type AnswerablePrompt } from "./promptForAnswers.js";

/** Answer prompts from a script keyed by question name, recording each ask. */
const scriptedHandler = (script: Record<string, unknown>, asked: string[]) => {
  return (effect: Effect & { _tag: "Prompt" }): Promise<unknown> => {
    asked.push(effect.question.name);
    return Promise.resolve(script[effect.question.name]);
  };
};

const prompts: AnswerablePrompt[] = [
  { name: "name", message: "Component name", type: "text" },
  {
    name: "withTests",
    message: "Include tests?",
    type: "confirm",
    default: true,
  },
  {
    name: "testRunner",
    message: "Test runner",
    type: "select",
    choices: [{ label: "Vitest", value: "vitest" }],
    when: (answers) => answers.withTests === true,
    default: "vitest",
  },
  {
    name: "features",
    message: "Features",
    type: "multiselect",
    choices: [
      { label: "A", value: "a" },
      { label: "B", value: "b" },
    ],
    default: ["a"],
  },
];

describe("promptForAnswers", () => {
  it("asks each prompt as a Prompt effect and returns the answers", async () => {
    const asked: string[] = [];
    const answers = await runTask(promptForAnswers(prompts), {
      promptHandler: scriptedHandler(
        {
          name: "Button",
          withTests: true,
          testRunner: "vitest",
          features: ["b"],
        },
        asked,
      ),
    });

    expect(asked).toEqual(["name", "withTests", "testRunner", "features"]);
    expect(answers).toEqual({
      name: "Button",
      withTests: true,
      testRunner: "vitest",
      features: ["b"],
    });
  });

  it("skips prompts already answered by partial answers", async () => {
    const asked: string[] = [];
    const answers = await runTask(
      promptForAnswers(prompts, { name: "Card", withTests: false }),
      { promptHandler: scriptedHandler({ features: [] }, asked) },
    );

    expect(asked).toEqual(["features"]);
    expect(answers.name).toBe("Card");
  });

  it("evaluates when-conditions against earlier answers", async () => {
    const asked: string[] = [];
    await runTask(promptForAnswers(prompts), {
      promptHandler: scriptedHandler(
        { name: "x", withTests: false, features: [] },
        asked,
      ),
    });

    // withTests answered false, so testRunner's when() suppressed it.
    expect(asked).toEqual(["name", "withTests", "features"]);
  });

  it("evaluates when-conditions against partial answers too", async () => {
    const asked: string[] = [];
    await runTask(promptForAnswers(prompts, { withTests: true }), {
      promptHandler: scriptedHandler(
        { name: "x", testRunner: "vitest", features: [] },
        asked,
      ),
    });

    expect(asked).toContain("testRunner");
  });

  it("maps definitions onto typed questions, coercing defaults per type", async () => {
    const seen: Array<Effect & { _tag: "Prompt" }> = [];
    const mixed: AnswerablePrompt[] = [
      { name: "t", message: "T", type: "text", default: 7 },
      { name: "c", message: "C", type: "confirm", default: "yes" },
      { name: "s", message: "S", type: "select", default: 3 },
      { name: "s2", message: "S2", type: "select" },
      { name: "m", message: "M", type: "multiselect", default: [1, "b"] },
      { name: "m2", message: "M2", type: "multiselect", default: "solo" },
      { name: "m3", message: "M3", type: "multiselect" },
    ];

    await runTask(promptForAnswers(mixed), {
      promptHandler: (effect) => {
        seen.push(effect);
        return Promise.resolve(undefined);
      },
    });

    expect(seen.map((e) => e.question)).toEqual([
      {
        type: "text",
        name: "t",
        message: "T",
        default: "7",
        validate: undefined,
      },
      // A non-boolean confirm default is dropped rather than coerced.
      { type: "confirm", name: "c", message: "C", default: undefined },
      { type: "select", name: "s", message: "S", choices: [], default: "3" },
      {
        type: "select",
        name: "s2",
        message: "S2",
        choices: [],
        default: undefined,
      },
      {
        type: "multiselect",
        name: "m",
        message: "M",
        choices: [],
        default: ["1", "b"],
      },
      // A scalar multiselect default is lifted into a one-element list.
      {
        type: "multiselect",
        name: "m2",
        message: "M2",
        choices: [],
        default: ["solo"],
      },
      {
        type: "multiselect",
        name: "m3",
        message: "M3",
        choices: [],
        default: undefined,
      },
    ]);
  });

  it("passes a text validate function through to the question", async () => {
    const validate = (value: string): boolean | string =>
      value.length > 0 || "required";
    let received: unknown;

    await runTask(
      promptForAnswers([{ name: "n", message: "N", type: "text", validate }]),
      {
        promptHandler: (effect) => {
          received =
            effect.question.type === "text"
              ? effect.question.validate
              : undefined;
          return Promise.resolve("ok");
        },
      },
    );

    expect(received).toBe(validate);
  });

  it("returns just the partial answers when every prompt is answered", async () => {
    const answers = await runTask(
      promptForAnswers([{ name: "only", message: "?", type: "text" }], {
        only: "given",
      }),
      {
        promptHandler: () => {
          throw new Error("must not ask");
        },
      },
    );

    expect(answers).toEqual({ only: "given" });
  });
});
