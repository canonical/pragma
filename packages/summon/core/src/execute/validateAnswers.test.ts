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
      "Invalid --component-path: path required",
    );
  });

  it("rejects with a generic message when validate returns non-string falsy", () => {
    expect(validateAnswers(prompts, { flag: true })).toBe(
      "Invalid --flag: invalid value",
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
