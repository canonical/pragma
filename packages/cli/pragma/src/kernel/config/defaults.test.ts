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
    expect(
      defaults.packs?.map((pack) =>
        typeof pack === "string"
          ? pack
          : { name: pack.name, source: pack.source },
      ),
    ).toEqual([
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

  it("carries the declared read stories through validation, on their packs", () => {
    // The zod layer must not strip `stories` (unknown keys ARE stripped for
    // forward compatibility). Content is owned by `capabilities/distribution.test.ts`;
    // this pins only that the field survives `parseRawConfig` on the right pack.
    const storyCounts = defaults.packs?.map((pack) =>
      typeof pack === "string" ? 0 : (pack.stories?.length ?? 0),
    );
    expect(storyCounts).toEqual([4, 0, 1]);
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

  it("declares the domain namespaces the store is built with and the CLI resolves", () => {
    // Two consumers, one declaration. (1) The config layer wins every prefix
    // harvest, so this is what keeps `ds:` entity names stable when the design
    // system declares `ds:` with two IRIs. (2) It is the domain half of
    // `DEFAULT_PREFIX_MAP`, so it also decides which prefixed names a lookup
    // can expand — `cs:` is here for that reader.
    expect(defaults.prefixes).toEqual({
      ds: "https://ds.canonical.com/",
      cs: "http://pragma.canonical.com/codestandards#",
    });
  });

  it("ships the normal channel and standard detail level", () => {
    expect(defaults.channel).toBe("normal");
    expect(defaults.detail).toBe("standard");
  });
});
