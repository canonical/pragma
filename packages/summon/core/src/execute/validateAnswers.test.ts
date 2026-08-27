import { describe, expect, it } from "vitest";
import type PromptDefinition from "../types/PromptDefinition.js";
import validateAnswers from "./validateAnswers.js";

const prompts: PromptDefinition[] = [
  {
    name: "kind",
    type: "select",
    message: "Kind",
    choices: [
      { label: "A", value: "a" },
      { label: "B", value: "b" },
    ],
  },
  {
    name: "componentPath",
    type: "text",
    message: "Path",
    validate: (v) => (String(v).length > 0 ? true : "path required"),
  },
  { name: "onlyForB", type: "text", message: "B", when: (a) => a.kind === "b" },
  {
    name: "flag",
    type: "confirm",
    message: "Flag",
    validate: () => false,
  },
];

describe("validateAnswers", () => {
  it("returns null when every applicable answer is valid", () => {
    expect(
      validateAnswers(prompts.slice(0, 2), { kind: "a", componentPath: "X" }),
    ).toBeNull();
  });

  it("rejects an unknown select value with the valid set", () => {
    const msg = validateAnswers(prompts, { kind: "zzz" });
    expect(msg).toBe('Invalid --kind "zzz". Valid values: a, b.');
  });

  it("rejects a value its validate function rejects (string message)", () => {
    expect(validateAnswers(prompts, { componentPath: "" })).toBe(
      'Invalid --component-path "": path required',
    );
  });

  it("rejects with a generic message when validate returns non-string falsy", () => {
    expect(validateAnswers(prompts, { flag: true })).toBe(
      'Invalid --flag "true": invalid value',
    );
  });

  it("skips when-gated prompts that do not apply", () => {
    // onlyForB has no answer and only applies when kind === 'b'; kind is 'a'.
    expect(validateAnswers(prompts.slice(0, 3), { kind: "a" })).toBeNull();
  });

  it("skips prompts with no answer present", () => {
    expect(validateAnswers(prompts, {})).toBeNull();
  });
});

describe("validateAnswers — multiselect and hostile names", () => {
  it("rejects a multiselect value outside the declared choices", () => {
    const prompts = [
      {
        name: "features",
        message: "?",
        type: "multiselect" as const,
        choices: [
          { label: "A", value: "a" },
          { label: "B", value: "b" },
        ],
      },
    ];
    // select membership was checked; multiselect flowed through unvalidated.
    expect(validateAnswers(prompts, { features: ["a", "zzz"] })).toContain(
      '"zzz"',
    );
    expect(validateAnswers(prompts, { features: ["a", "b"] })).toBeNull();
    // Strict entries: no coercion (1 is not the declared "1"-style string
    // value "a"/"b"), and an undefined entry is still reported.
    expect(validateAnswers(prompts, { features: [1] })).toContain('"1"');
    expect(validateAnswers(prompts, { features: [undefined] })).toContain(
      '"undefined"',
    );
  });

  it("names the offending flag with the CLI's own kebab form", () => {
    const prompts = [
      {
        name: "componentURL",
        message: "?",
        type: "text" as const,
        validate: () => "nope",
      },
    ];
    const message = validateAnswers(prompts, { componentURL: "x" });
    expect(message).toContain("--component-url");
    expect(message).not.toContain("--component-u-r-l");
  });

  it("does not treat prototype properties as provided answers", () => {
    const prompts = [
      {
        name: "toString",
        message: "?",
        type: "text" as const,
        validate: () => "invalid",
      },
    ];
    // `"toString" in answers` is true for any object; Object.hasOwn is not.
    expect(validateAnswers(prompts, {})).toBeNull();
    expect(validateAnswers(prompts, { toString: "x" })).toContain("invalid");
  });
});
