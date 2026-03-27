import { describe, expect, it } from "vitest";
import validateRepository from "./validateRepository.js";

describe("validateRepository", () => {
  it("accepts valid GitHub URLs", () => {
    expect(validateRepository("https://github.com/org/repo")).toBe(true);
  });

  it("accepts empty values (optional field)", () => {
    expect(validateRepository("")).toBe(true);
  });

  it("rejects non-GitHub URLs", () => {
    expect(validateRepository("not-a-url")).not.toBe(true);
  });
});
