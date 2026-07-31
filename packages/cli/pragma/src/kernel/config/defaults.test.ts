import { describe, expect, it } from "vitest";
import defaults from "./defaults.js";

describe("defaults — the validated distribution config (pragma.conf.ts)", () => {
  it("ships the distribution identity", () => {
    expect(defaults.name).toBe("pragma");
    expect(defaults.help).toBe("Explore the design system");
    expect(defaults.colophon).toBe(
      "Made by the Canonical Webteam — https://canonical.com.",
    );
    expect(defaults.issuesUrl).toBe(
      "https://github.com/canonical/pragma/issues",
    );
  });

  it("ships the three canonical default packs (git+https sources)", () => {
    expect(defaults.packs).toEqual([
      {
        name: "@canonical/design-system",
        source: "git+https://github.com/canonical/design-system.git#main",
      },
      {
        name: "@canonical/anatomy-dsl",
        source: "git+https://github.com/canonical/anatomy-dsl.git#main",
      },
      {
        name: "@canonical/code-standards",
        source: "git+https://github.com/canonical/web-code-standards.git#main",
      },
    ]);
  });

  it("ships the three summon generators (npm sources at the monorepo major)", () => {
    expect(defaults.generators).toEqual([
      {
        name: "@canonical/summon-component",
        source: "npm:@canonical/summon-component@^0.33.0",
      },
      {
        name: "@canonical/summon-package",
        source: "npm:@canonical/summon-package@^0.33.0",
      },
      {
        name: "@canonical/summon-application",
        source: "npm:@canonical/summon-application@^0.33.0",
      },
    ]);
  });

  it("pins the ds: namespace so prefix harvesting cannot bind it elsewhere", () => {
    // The design system declares `ds:` with two IRIs; the config layer wins
    // every harvest, so this is what keeps `ds:` entity names stable.
    expect(defaults.prefixes).toEqual({ ds: "https://ds.canonical.com/" });
  });

  it("ships the normal channel and standard detail level", () => {
    expect(defaults.channel).toBe("normal");
    expect(defaults.detail).toBe("standard");
  });
});
