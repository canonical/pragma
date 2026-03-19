import { describe, expect, it } from "vitest";
import {
  buildTierFilter,
  resolveTierChain,
  tierPathToLocal,
} from "./buildTierFilter.js";

describe("resolveTierChain", () => {
  it("returns empty array for undefined", () => {
    expect(resolveTierChain(undefined)).toEqual([]);
  });

  it("returns ['global'] for 'global'", () => {
    expect(resolveTierChain("global")).toEqual(["global"]);
  });

  it("returns ['global', 'apps'] for 'apps'", () => {
    expect(resolveTierChain("apps")).toEqual(["global", "apps"]);
  });

  it("returns full chain for 'apps/lxd'", () => {
    expect(resolveTierChain("apps/lxd")).toEqual([
      "global",
      "apps",
      "apps/lxd",
    ]);
  });

  it("handles deep nesting", () => {
    expect(resolveTierChain("apps/lxd/storage")).toEqual([
      "global",
      "apps",
      "apps/lxd",
      "apps/lxd/storage",
    ]);
  });
});

describe("tierPathToLocal", () => {
  it("converts slashes to underscores", () => {
    expect(tierPathToLocal("apps/lxd")).toBe("apps_lxd");
  });

  it("leaves single segment unchanged", () => {
    expect(tierPathToLocal("global")).toBe("global");
  });

  it("handles deep paths", () => {
    expect(tierPathToLocal("apps/lxd/storage")).toBe("apps_lxd_storage");
  });
});

describe("buildTierFilter", () => {
  it("returns empty string for undefined tier", () => {
    expect(buildTierFilter(undefined)).toBe("");
  });

  it("generates FILTER for 'global'", () => {
    expect(buildTierFilter("global")).toBe("FILTER(?tier IN (ds:global))");
  });

  it("generates FILTER for 'apps/lxd' with parent chain", () => {
    expect(buildTierFilter("apps/lxd")).toBe(
      "FILTER(?tier IN (ds:global, ds:apps, ds:apps_lxd))",
    );
  });

  it("uses custom variable name", () => {
    expect(buildTierFilter("apps", "t")).toBe(
      "FILTER(?t IN (ds:global, ds:apps))",
    );
  });
});
