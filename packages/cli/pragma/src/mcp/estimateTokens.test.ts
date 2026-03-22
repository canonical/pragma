import { describe, expect, it } from "vitest";
import estimateTokens from "./estimateTokens.js";

describe("estimateTokens", () => {
  it("estimates ~1 token per 4 chars", () => {
    expect(estimateTokens("abcd")).toBe("~1");
    expect(estimateTokens("abcdefgh")).toBe("~2");
    expect(estimateTokens("a")).toBe("~1");
  });

  it("rounds up", () => {
    expect(estimateTokens("abcde")).toBe("~2");
  });
});
