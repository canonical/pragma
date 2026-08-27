import { describe, expect, it } from "vitest";
import type PromptDefinition from "../types/PromptDefinition.js";
import extractAnswers from "./extractAnswers.js";

const prompts: PromptDefinition[] = [
  { name: "name", type: "text", message: "Name:" },
  { name: "withStyles", type: "confirm", message: "Styles?", default: true },
  { name: "withRelay", type: "confirm", message: "Relay?", default: false },
  {
    name: "features",
    type: "multiselect",
    message: "Features:",
    choices: [
      { label: "a", value: "a" },
      { label: "b", value: "b" },
    ],
  },
];

describe("extractAnswers", () => {
  it("returns only explicitly provided answers", () => {
    expect(extractAnswers({}, prompts)).toEqual({});
    expect(extractAnswers({ name: "x" }, prompts)).toEqual({ name: "x" });
  });

  it("a confirm equal to its default is treated as unprovided", () => {
    // Commander reports --no-<flag> options as `true` when untouched.
    expect(extractAnswers({ withStyles: true }, prompts)).toEqual({});
    expect(extractAnswers({ withRelay: false }, prompts)).toEqual({});
  });

  it("a confirm differing from its default is explicit", () => {
    expect(extractAnswers({ withStyles: false }, prompts)).toEqual({
      withStyles: false,
    });
    expect(extractAnswers({ withRelay: true }, prompts)).toEqual({
      withRelay: true,
    });
  });

  it("splits a comma-separated multiselect string, trimming items", () => {
    expect(extractAnswers({ features: "a, b" }, prompts)).toEqual({
      features: ["a", "b"],
    });
  });

  it("passes a non-string multiselect value through", () => {
    expect(extractAnswers({ features: ["a"] }, prompts)).toEqual({
      features: ["a"],
    });
  });

  it("ignores options that match no prompt", () => {
    expect(extractAnswers({ unrelated: 1 }, prompts)).toEqual({});
  });

  it("a prompt named like an inherited member reads own properties only", () => {
    // `options` is an ordinary object, so `options.toString` is inherited
    // from Object.prototype — a prompt named `toString` must NOT count as
    // provided (the read is Object.hasOwn-guarded, matching
    // validateAnswers' own-property semantics), while an explicit own value
    // still binds.
    const inherited: PromptDefinition[] = [
      { name: "toString", type: "text", message: "Custom toString:" },
    ];
    expect(extractAnswers({}, inherited)).toEqual({});
    expect(extractAnswers({ toString: "mine" }, inherited)).toEqual({
      toString: "mine",
    });
  });
});
