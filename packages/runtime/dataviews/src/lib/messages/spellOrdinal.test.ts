import { describe, expect, it } from "vitest";
import spellOrdinal from "./spellOrdinal.js";

describe("spellOrdinal", () => {
  it("suffixes each position by English's ordinal rules, teens included", () => {
    expect(
      [1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 101, 111].map(spellOrdinal),
    ).toEqual([
      "1st",
      "2nd",
      "3rd",
      "4th",
      "11th",
      "12th",
      "13th",
      "21st",
      "22nd",
      "23rd",
      "101st",
      "111th",
    ]);
  });
});
