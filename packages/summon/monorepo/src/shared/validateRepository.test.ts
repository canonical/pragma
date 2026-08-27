import { describe, expect, it } from "vitest";
import validateRepository, {
  normalizeRepositoryUrl,
} from "./validateRepository.js";

describe("validateRepository", () => {
  it("accepts valid GitHub URLs", () => {
    expect(validateRepository("https://github.com/org/repo")).toBe(true);
    expect(validateRepository("https://github.com/org/repo/")).toBe(true);
    expect(validateRepository("https://github.com/org/repo.git")).toBe(true);
  });

  it("accepts empty values (optional field)", () => {
    expect(validateRepository("")).toBe(true);
    expect(validateRepository(undefined)).toBe(true);
  });

  it("rejects non-GitHub URLs", () => {
    expect(validateRepository("not-a-url")).not.toBe(true);
  });

  it("rejects a GitHub URL without an org/repo path", () => {
    expect(validateRepository("https://github.com/")).not.toBe(true);
    expect(validateRepository("https://github.com/only-org")).not.toBe(true);
  });

  it("rejects truthy non-string values instead of skipping validation", () => {
    expect(validateRepository(42)).not.toBe(true);
    expect(validateRepository(true)).not.toBe(true);
    expect(validateRepository(["https://github.com/a/b"])).not.toBe(true);
  });
});

describe("normalizeRepositoryUrl", () => {
  it("canonicalizes accepted noncanonical forms", () => {
    expect(normalizeRepositoryUrl(" https://github.com/org/repo ")).toBe(
      "https://github.com/org/repo",
    );
    expect(normalizeRepositoryUrl("https://github.com/org/repo/")).toBe(
      "https://github.com/org/repo",
    );
    expect(normalizeRepositoryUrl("https://github.com/org/repo.git")).toBe(
      "https://github.com/org/repo",
    );
    expect(normalizeRepositoryUrl("https://github.com/org/repo")).toBe(
      "https://github.com/org/repo",
    );
  });
});
