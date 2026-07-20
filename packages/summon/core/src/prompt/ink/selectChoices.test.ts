import { describe, expect, it } from "vitest";
import { classifySelectChoices, type SelectChoice } from "./selectChoices.js";

const choice = (value: string): SelectChoice => ({ label: value, value });

describe("classifySelectChoices", () => {
  it("classifies zero choices as empty (the wizard must not hang on it)", () => {
    expect(classifySelectChoices([])).toEqual({ kind: "empty" });
  });

  it("classifies exactly one choice as single, carrying its value to auto-resolve", () => {
    expect(classifySelectChoices([choice("only")])).toEqual({
      kind: "single",
      value: "only",
    });
  });

  it("classifies two or more choices as the normal multiple list", () => {
    const choices = [choice("a"), choice("b")];
    expect(classifySelectChoices(choices)).toEqual({
      kind: "multiple",
      choices,
    });
  });
});
