import type { URI } from "@canonical/ke";
import { describe, expect, it } from "vitest";
import type { TierEntry } from "../../shared/types.js";
import formatters from "./list.js";

const TIERS: TierEntry[] = [
  { uri: "http://example.com/t1" as URI, path: "apps", depth: 0 },
  { uri: "http://example.com/t2" as URI, path: "apps/lxd", depth: 0 },
  { uri: "http://example.com/t3" as URI, path: "global", depth: 0 },
];

describe("tier list formatters", () => {
  it("plain renders flat tier names", () => {
    const text = formatters.plain(TIERS);
    expect(text).toContain("global");
    expect(text).toContain("apps");
    expect(text).toContain("apps/lxd");
  });

  it("plain renders one tier per line", () => {
    const text = formatters.plain(TIERS);
    const lines = text.split("\n").filter(Boolean);
    expect(lines).toHaveLength(3);
  });

  it("llm renders markdown heading and bold paths", () => {
    const text = formatters.llm(TIERS);
    expect(text).toContain("## Tiers");
    expect(text).toContain("- **global**");
    expect(text).toContain("- **apps**");
    expect(text).toContain("- **apps/lxd**");
  });
});
