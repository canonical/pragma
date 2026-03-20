import type { URI } from "@canonical/ke";
import { describe, expect, it } from "vitest";
import type { TierEntry } from "../../shared/types.js";
import formatters from "./list.js";

const TIERS: TierEntry[] = [
  { uri: "http://example.com/t1" as URI, path: "global", depth: 0 },
  {
    uri: "http://example.com/t2" as URI,
    path: "apps",
    parent: "global",
    depth: 1,
  },
  {
    uri: "http://example.com/t3" as URI,
    path: "apps/lxd",
    parent: "apps",
    depth: 2,
  },
];

describe("tier list formatters", () => {
  it("plain renders hierarchy with indentation", () => {
    const text = formatters.plain(TIERS);
    expect(text).toContain("global");
    expect(text).toContain("  apps (parent: global)");
    expect(text).toContain("    apps/lxd (parent: apps)");
  });

  it("plain omits parent for root tier", () => {
    const text = formatters.plain(TIERS);
    const globalLine = text.split("\n")[0];
    expect(globalLine).toBe("global");
  });

  it("llm renders markdown heading and bold paths", () => {
    const text = formatters.llm(TIERS);
    expect(text).toContain("## Tiers");
    expect(text).toContain("- **global**");
    expect(text).toContain("  - **apps**");
    expect(text).toContain("    - **apps/lxd**");
  });
});
