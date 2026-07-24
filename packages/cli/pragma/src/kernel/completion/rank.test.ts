import { describe, expect, it } from "vitest";
import { filterPrefix, MAX_CANDIDATES, rankCandidates } from "./rank.js";

describe("rankCandidates (PROTECTED)", () => {
  it("ranks exact > prefix > substring, case-insensitively", () => {
    const candidates = ["abutton", "button-group", "Button", "chip"];
    expect(rankCandidates(candidates, "button")).toEqual([
      "Button",
      "button-group",
      "abutton",
    ]);
  });

  it("breaks ties lexicographically within a strength band", () => {
    expect(rankCandidates(["chip", "card", "candy"], "c")).toEqual([
      "candy",
      "card",
      "chip",
    ]);
  });

  it("dedupes candidates", () => {
    expect(rankCandidates(["a", "a", "ab"], "a")).toEqual(["a", "ab"]);
  });

  it("lists the full set, sorted, for an empty partial", () => {
    expect(rankCandidates(["b", "a", "c"], "")).toEqual(["a", "b", "c"]);
  });

  it("returns nothing when nothing matches", () => {
    expect(rankCandidates(["alpha", "beta"], "zzz")).toEqual([]);
  });

  it("caps at MAX_CANDIDATES by default and honours a custom limit", () => {
    const many = Array.from(
      { length: 80 },
      (_, i) => `name-${String(i).padStart(2, "0")}`,
    );
    expect(rankCandidates(many, "name").length).toBe(MAX_CANDIDATES);
    expect(rankCandidates(many, "name", 3)).toEqual([
      "name-00",
      "name-01",
      "name-02",
    ]);
  });

  it("match=prefix rejects substring-only matches", () => {
    const candidates = ["abutton", "button-group", "Button"];
    // substring (default) keeps abutton; prefix drops it.
    expect(rankCandidates(candidates, "button")).toContain("abutton");
    expect(
      rankCandidates(candidates, "button", MAX_CANDIDATES, "prefix"),
    ).toEqual(["Button", "button-group"]);
  });

  it("match=fuzzy accepts an in-order subsequence, ranked lowest", () => {
    const candidates = ["button", "bacon", "chip"];
    // "bn" is a subsequence of button/bacon but a substring of neither.
    expect(
      rankCandidates(candidates, "bn", MAX_CANDIDATES, "substring"),
    ).toEqual([]);
    expect(
      rankCandidates(candidates, "bn", MAX_CANDIDATES, "fuzzy").sort(),
    ).toEqual(["bacon", "button"]);
    // A prefix match still outranks a fuzzy subsequence.
    expect(
      rankCandidates(["breadcrumb", "button"], "bu", MAX_CANDIDATES, "fuzzy"),
    ).toEqual(["button", "breadcrumb"]);
  });

  it("caseSensitive matches without folding case", () => {
    const candidates = ["Button", "button-group"];
    expect(
      rankCandidates(candidates, "Bu", MAX_CANDIDATES, "substring", true),
    ).toEqual(["Button"]);
    expect(
      rankCandidates(candidates, "bu", MAX_CANDIDATES, "substring", true),
    ).toEqual(["button-group"]);
  });
});

describe("filterPrefix (PROTECTED)", () => {
  it("filters by case-sensitive prefix (agrees with compgen)", () => {
    expect(filterPrefix(["config", "Config", "create"], "co")).toEqual([
      "config",
    ]);
    expect(filterPrefix(["config", "Config"], "Co")).toEqual(["Config"]);
  });

  it("sorts and dedupes the matches", () => {
    expect(filterPrefix(["beta", "alpha", "alpha"], "")).toEqual([
      "alpha",
      "beta",
    ]);
  });

  it("returns nothing when nothing matches", () => {
    expect(filterPrefix(["alpha"], "b")).toEqual([]);
  });
});
