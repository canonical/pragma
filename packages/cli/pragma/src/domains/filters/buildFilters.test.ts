import { describe, expect, it } from "vitest";
import { P } from "../shared/prefixes.js";
import { buildFilters } from "./buildFilters.js";

describe("buildFilters", () => {
  it("returns only channel filter when tier is undefined", () => {
    const result = buildFilters({ tier: undefined, channel: "normal" });
    expect(result).not.toContain("FILTER(?tier");
    expect(result).toContain("FILTER(!BOUND(?release)");
  });

  it("combines tier and channel filters", () => {
    const result = buildFilters({ tier: "apps/lxd", channel: "experimental" });
    expect(result).toContain(
      `FILTER(?tier IN (${P.ds}global, ${P.ds}apps, ${P.ds}apps_lxd))`,
    );
    expect(result).toContain(`${P.ds}stable, ${P.ds}experimental`);
  });

  it("returns channel filter for undefined tier + prerelease", () => {
    const result = buildFilters({ tier: undefined, channel: "prerelease" });
    expect(result).toContain(`${P.ds}alpha, ${P.ds}beta`);
    expect(result).not.toContain("FILTER(?tier");
  });

  it("returns both filters for global tier + normal channel", () => {
    const result = buildFilters({ tier: "global", channel: "normal" });
    expect(result).toContain(`FILTER(?tier IN (${P.ds}global))`);
    expect(result).toContain(
      `FILTER(!BOUND(?release) || ?release IN (${P.ds}stable))`,
    );
  });
});
