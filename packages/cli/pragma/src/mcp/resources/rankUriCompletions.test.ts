import { describe, expect, it } from "vitest";
import rankUriCompletions from "./rankUriCompletions.js";
import type { UriCompletionCandidate } from "./types.js";

const candidates: UriCompletionCandidate[] = [
  { prefixed: "ds:Component", label: "Component" },
  { prefixed: "ds:global.component.button", label: "Button" },
  { prefixed: "ds:global.component.card", label: "Card" },
  { prefixed: "cs:code_purity", label: "code/function/purity" },
];

describe("rankUriCompletions", () => {
  it("matches a URI substring case-insensitively", () => {
    expect(rankUriCompletions(candidates, "BUTTON", 10)).toContain(
      "ds:global.component.button",
    );
  });

  it("matches a human label fragment", () => {
    expect(rankUriCompletions(candidates, "card", 10)).toContain(
      "ds:global.component.card",
    );
  });

  it("ranks an exact match above a substring match", () => {
    const ranked = rankUriCompletions(candidates, "component", 10);
    expect(ranked.indexOf("ds:Component")).toBeLessThan(
      ranked.indexOf("ds:global.component.button"),
    );
  });

  it("ranks a prefix match above a substring match", () => {
    const ranked = rankUriCompletions(candidates, "comp", 10);
    expect(ranked.indexOf("ds:Component")).toBeLessThan(
      ranked.indexOf("ds:global.component.button"),
    );
  });

  it("returns the compacted URI even when matched by label", () => {
    expect(rankUriCompletions(candidates, "purity", 10)).toEqual([
      "cs:code_purity",
    ]);
  });

  it("caps the result count", () => {
    expect(rankUriCompletions(candidates, "", 2)).toHaveLength(2);
  });

  it("excludes non-matches", () => {
    expect(rankUriCompletions(candidates, "zzz", 10)).toEqual([]);
  });
});
