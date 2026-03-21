import { describe, expect, it } from "vitest";
import { P } from "../shared/prefixes.js";
import { buildChannelFilter, CHANNEL_RELEASES } from "./buildChannelFilter.js";

describe("CHANNEL_RELEASES", () => {
  it("normal includes only stable", () => {
    expect(CHANNEL_RELEASES.normal).toEqual(["stable"]);
  });

  it("experimental includes stable + experimental", () => {
    expect(CHANNEL_RELEASES.experimental).toEqual(["stable", "experimental"]);
  });

  it("prerelease includes all four", () => {
    expect(CHANNEL_RELEASES.prerelease).toEqual([
      "stable",
      "experimental",
      "alpha",
      "beta",
    ]);
  });
});

describe("buildChannelFilter", () => {
  it("generates OPTIONAL + FILTER for normal", () => {
    const result = buildChannelFilter("normal");
    expect(result).toContain(`OPTIONAL { ?component ${P.ds}release ?release }`);
    expect(result).toContain(
      `FILTER(!BOUND(?release) || ?release IN (${P.ds}stable))`,
    );
  });

  it("generates filter for experimental with two releases", () => {
    const result = buildChannelFilter("experimental");
    expect(result).toContain(
      `?release IN (${P.ds}stable, ${P.ds}experimental)`,
    );
  });

  it("generates filter for prerelease with all releases", () => {
    const result = buildChannelFilter("prerelease");
    expect(result).toContain(
      `?release IN (${P.ds}stable, ${P.ds}experimental, ${P.ds}alpha, ${P.ds}beta)`,
    );
  });

  it("uses custom variable name", () => {
    const result = buildChannelFilter("normal", "r");
    expect(result).toContain(`?r IN (${P.ds}stable)`);
    expect(result).toContain("BOUND(?r)");
  });
});
