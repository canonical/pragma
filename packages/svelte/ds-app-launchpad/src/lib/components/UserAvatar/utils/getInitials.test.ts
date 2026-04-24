import { describe, expect, it } from "vitest";
import { getInitials } from "./getInitials.js";

describe("getInitials", () => {
  it.each([
    ["Ada", "A"],
    ["Ada Lovelace", "AL"],
    ["Ada Lovelace Byron", "AL"],
    ["  Ada   Lovelace  ", "AL"],
    ["", ""],
    ["     ", ""],
    ["A B", "AB"],
    ["Jean-Luc Picard", "JP"],
  ])("maps %j -> %j", (userName, expected) => {
    expect(getInitials(userName)).toBe(expected);
  });

  it("keeps the first character of each selected word as-is", () => {
    expect(getInitials("alice bob")).toBe("ab");
  });

  it("treats only spaces as separators", () => {
    expect(getInitials("Ada\tLovelace")).toBe("A");
    expect(getInitials("Ada\nLovelace")).toBe("A");
  });
});
