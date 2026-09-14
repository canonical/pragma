import { describe, expect, it } from "vitest";
import compileLikePattern from "./compileLikePattern.js";

/** Whether one value matches one pattern, compiled for the call. */
const matchesLike = (value: string, pattern: string): boolean =>
  compileLikePattern(pattern)(value);

describe("compileLikePattern", () => {
  it("reads a percent sign as any run and an underscore as one character", () => {
    expect(matchesLike("disk_a", "d%a")).toBe(true);
    expect(matchesLike("diskXa", "disk_a")).toBe(true);
    expect(matchesLike("disk", "disk_")).toBe(false);
  });

  it("reads an escaped character literally", () => {
    expect(matchesLike("diskXa", "disk\\_a")).toBe(false);
    expect(matchesLike("disk_a", "disk\\_a")).toBe(true);
    expect(matchesLike("50% full", "50\\%%")).toBe(true);
    expect(matchesLike("5050", "50\\%%")).toBe(false);
  });

  it("matches regular expression syntax as the characters it is", () => {
    expect(matchesLike("a.b", "a.b")).toBe(true);
    expect(matchesLike("axb", "a.b")).toBe(false);
    expect(matchesLike("(x)[y]{z}|^$+?*/-", "(x)[y]{z}|^$+?*/-")).toBe(true);
  });

  it("counts one character beyond the basic plane as one", () => {
    expect(matchesLike("\u{1F600}", "_")).toBe(true);
  });
});
