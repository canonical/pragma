import type { URI } from "@canonical/ke";
import { describe, expect, it } from "vitest";
import type { TokenSummary } from "../../shared/types/index.js";
import formatters from "./list.js";

const TOKENS: TokenSummary[] = [
  {
    uri: "http://example.com/t1" as URI,
    name: "color.primary",
    category: "Color",
  },
  {
    uri: "http://example.com/t2" as URI,
    name: "spacing.sm",
    category: "Dimension",
  },
];

describe("token list formatters", () => {
  it("plain renders name with category in brackets", () => {
    const text = formatters.plain(TOKENS);
    expect(text).toContain("color.primary [Color]");
    expect(text).toContain("spacing.sm [Dimension]");
  });

  it("plain omits brackets when category is empty", () => {
    const text = formatters.plain([{ ...TOKENS[0], category: "" }]);
    expect(text).not.toContain("[");
  });

  it("llm renders markdown heading and bold names", () => {
    const text = formatters.llm(TOKENS);
    expect(text).toContain("## Design Tokens");
    expect(text).toContain("**color.primary**");
    expect(text).toContain("**spacing.sm**");
  });
});
