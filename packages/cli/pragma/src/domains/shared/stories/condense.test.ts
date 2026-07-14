import { describe, expect, it } from "vitest";
import condense from "./condense.js";

describe("condense", () => {
  it("wraps text in the condensed envelope with a chars/4 token estimate", () => {
    const result = condense("abcdefgh");
    expect(result).toEqual({
      condensed: true,
      text: "abcdefgh",
      tokens: "~2",
    });
  });

  it("rounds the token estimate up", () => {
    const result = condense("abcde");
    expect(result).toEqual({ condensed: true, text: "abcde", tokens: "~2" });
  });
});
