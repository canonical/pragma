import { describe, expect, it } from "vitest";
import type PromptDefinition from "../types/PromptDefinition.js";
import {
  applyDefaults,
  explicitAnswersComplete,
  hasAllRequiredAnswers,
  pendingPrompts,
} from "./answers.js";
import type { ProjectedPrompt } from "./types.js";

const live: PromptDefinition[] = [
  { name: "path", type: "text", message: "Path:", default: "src/X" },
  { name: "required", type: "text", message: "Required:" },
  { name: "withStories", type: "confirm", message: "Stories?", default: true },
  {
    name: "useTsStories",
    type: "confirm",
    message: "TS stories?",
    default: false,
    when: (answers) => answers.withStories === true,
  },
];

/** The same list in projected form (when -> conditional). */
const projected: ProjectedPrompt[] = [
  { name: "path", type: "text", message: "Path:", default: "src/X" },
  { name: "required", type: "text", message: "Required:" },
  { name: "withStories", type: "confirm", message: "Stories?", default: true },
  {
    name: "useTsStories",
    type: "confirm",
    message: "TS stories?",
    default: false,
    conditional: true,
  },
];

describe("hasAllRequiredAnswers", () => {
  it("fails while an unconditional, default-less prompt is unanswered", () => {
    expect(hasAllRequiredAnswers(live, {})).toBe(false);
    expect(hasAllRequiredAnswers(live, { required: "x" })).toBe(true);
  });

  it("skips conditional prompts (live `when` and projected `conditional`)", () => {
    const noDefault: ProjectedPrompt[] = [
      { name: "maybe", type: "text", message: "?", conditional: true },
    ];
    expect(hasAllRequiredAnswers(noDefault, {})).toBe(true);
    const liveNoDefault: PromptDefinition[] = [
      { name: "maybe", type: "text", message: "?", when: () => false },
    ];
    expect(hasAllRequiredAnswers(liveNoDefault, {})).toBe(true);
  });
});

describe("applyDefaults", () => {
  it("fills declared defaults without overwriting provided answers", () => {
    expect(applyDefaults(live, { path: "custom" })).toEqual({
      path: "custom",
      withStories: true,
      useTsStories: false,
    });
  });

  it("never mutates the input", () => {
    const input = {};
    applyDefaults(live, input);
    expect(input).toEqual({});
  });
});

describe("explicitAnswersComplete", () => {
  it("requires every unconditional prompt explicitly — defaults do not count", () => {
    expect(explicitAnswersComplete(live, {})).toBe(false);
    expect(
      explicitAnswersComplete(live, {
        path: "a",
        required: "b",
        withStories: false,
      }),
    ).toBe(true);
  });

  it("skips conditional prompts in both forms", () => {
    const answers = { path: "a", required: "b", withStories: true };
    expect(explicitAnswersComplete(live, answers)).toBe(true);
    expect(explicitAnswersComplete(projected, answers)).toBe(true);
  });
});

describe("pendingPrompts", () => {
  it("returns the unanswered prompts in declared order", () => {
    expect(pendingPrompts(live, { required: "x" }).map((p) => p.name)).toEqual([
      "path",
      "withStories",
      "useTsStories",
    ]);
  });

  it("includes conditional prompts — the live wizard evaluates their `when`", () => {
    expect(pendingPrompts(projected, {}).map((p) => p.name)).toEqual([
      "path",
      "required",
      "withStories",
      "useTsStories",
    ]);
  });

  it("is empty when everything is explicitly answered", () => {
    expect(
      pendingPrompts(live, {
        path: "a",
        required: "b",
        withStories: true,
        useTsStories: false,
      }),
    ).toEqual([]);
  });

  it("a prompt named like an inherited member stays pending — own properties only", () => {
    // `{}` inherits `toString` from Object.prototype; an `in` check would
    // count it as explicitly answered and silently skip the prompt. All the
    // answer-set predicates use Object.hasOwn (matching validateAnswers).
    const inherited = [
      { name: "toString", type: "text" as const, message: "Custom toString:" },
    ];
    expect(pendingPrompts(inherited, {}).map((p) => p.name)).toEqual([
      "toString",
    ]);
    expect(explicitAnswersComplete(inherited, {})).toBe(false);
    expect(hasAllRequiredAnswers(inherited, {})).toBe(false);
    expect(
      applyDefaults(
        [{ ...inherited[0], default: "d" } as (typeof inherited)[0]],
        {},
      ),
    ).toEqual({ toString: "d" });
  });
});
