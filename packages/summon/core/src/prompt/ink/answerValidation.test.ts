import { describe, expect, it } from "vitest";
import {
  DEFAULT_INVALID_MESSAGE,
  evaluateValidation,
} from "./answerValidation.js";

describe("evaluateValidation", () => {
  it("accepts when there is no validator", () => {
    expect(evaluateValidation(undefined, "anything")).toEqual({ ok: true });
  });

  it("accepts when the validator returns true", () => {
    expect(evaluateValidation(() => true, "x")).toEqual({ ok: true });
  });

  it("rejects with the validator's own message when it returns a string", () => {
    expect(evaluateValidation(() => "pick at least one", [])).toEqual({
      ok: false,
      message: "pick at least one",
    });
  });

  it("rejects with the default message when the validator returns bare false", () => {
    expect(evaluateValidation(() => false, "x")).toEqual({
      ok: false,
      message: DEFAULT_INVALID_MESSAGE,
    });
  });

  it("passes the candidate value through to the validator (e.g. a min-selection guard)", () => {
    const atLeastOne = (v: unknown): boolean | string =>
      Array.isArray(v) && v.length > 0 ? true : "select at least one";
    expect(evaluateValidation(atLeastOne, [])).toEqual({
      ok: false,
      message: "select at least one",
    });
    expect(evaluateValidation(atLeastOne, ["a"])).toEqual({ ok: true });
  });
});
