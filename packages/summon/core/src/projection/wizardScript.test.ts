/**
 * Wizard-script parity (A9): the ordered prompt list a live wizard asks IS
 * `pendingPrompts(prompts, explicit)` — with the one refinement the live
 * session owns: a conditional prompt is asked only when its `when` holds
 * against the answers collected so far. `collectAnswers` (the asking engine
 * behind pragma's wizard and every prompt strategy) is held to that script
 * here, so both products' wizards ask the same questions in the same order.
 */

import { runTask } from "@canonical/task/node";
import { describe, expect, it } from "vitest";
import collectAnswers from "../execute/collectAnswers.js";
import type PromptDefinition from "../types/PromptDefinition.js";
import { pendingPrompts } from "./answers.js";

const prompts: PromptDefinition[] = [
  { name: "componentPath", type: "text", message: "Path:", default: "src/X" },
  { name: "withStyles", type: "confirm", message: "Styles?", default: true },
  { name: "withStories", type: "confirm", message: "Stories?", default: true },
  {
    name: "useTsStories",
    type: "confirm",
    message: "TS stories?",
    default: false,
    when: (answers) => answers.withStories === true,
  },
];

/** Run collectAnswers with a recording handler answering defaults. */
async function askedNames(
  explicit: Record<string, unknown>,
  answerWith: Record<string, unknown> = {},
): Promise<string[]> {
  const asked: string[] = [];
  await runTask(collectAnswers(prompts, explicit), {
    promptHandler: (effect) => {
      const { name, default: def } = effect.question;
      asked.push(name);
      return Promise.resolve(name in answerWith ? answerWith[name] : def);
    },
  });
  return asked;
}

describe("wizard-script parity — collectAnswers asks pendingPrompts (PROTECTED)", () => {
  it("with no explicit answers, the ask order IS pendingPrompts", async () => {
    const script = pendingPrompts(prompts, {}).map((p) => p.name);
    expect(await askedNames({})).toEqual(script);
  });

  it("explicit answers are skipped; the rest keep declared order", async () => {
    const explicit = { withStyles: false };
    const script = pendingPrompts(prompts, explicit).map((p) => p.name);
    expect(script).toEqual(["componentPath", "withStories", "useTsStories"]);
    expect(await askedNames(explicit)).toEqual(script);
  });

  it("a conditional prompt is the live wizard's ONE refinement: dropped when its `when` fails", async () => {
    const explicit = {};
    const script = pendingPrompts(prompts, explicit).map((p) => p.name);
    // The projection's script includes the conditional; the live session
    // evaluates `when` with the collected answers and skips it when false.
    expect(await askedNames(explicit, { withStories: false })).toEqual(
      script.filter((name) => name !== "useTsStories"),
    );
  });

  it("a fully-explicit answer set asks nothing", async () => {
    const explicit = {
      componentPath: "a",
      withStyles: true,
      withStories: true,
      useTsStories: false,
    };
    expect(pendingPrompts(prompts, explicit)).toEqual([]);
    expect(await askedNames(explicit)).toEqual([]);
  });
});
