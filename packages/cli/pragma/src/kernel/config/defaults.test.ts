import { describe, expect, it } from "vitest";
import defaults from "./defaults.js";

describe("defaults — the validated distribution config (pragma.conf.ts)", () => {
  it("ships the distribution identity", () => {
    expect(defaults.name).toBe("pragma");
    expect(defaults.help).toBe("Explore the design system");
    expect(defaults.issuesUrl).toBe(
      "https://github.com/canonical/pragma/issues",
    );
  });

  it("declares the toolchain colophon as content (markdown body + summary)", () => {
    // The narrative is a DECLARATION the `colophon` verb renders, not code:
    // `collectColophon` reads exactly this object. Pin the shape and the two
    // stable fragments — the story's own subject and the maker line the old
    // one-line `colophon` string carried (folded in when the field went live).
    expect(defaults.colophon?.markdown).toContain("domain-based toolchain");
    expect(defaults.colophon?.markdown).toContain(
      "Made by the Canonical Webteam — https://canonical.com.",
    );
    expect(defaults.colophon?.summary).toContain("domain-based toolchain");
    // Bodies, not documents: the renderer supplies the H1 from the name.
    expect(defaults.colophon?.markdown.startsWith("#")).toBe(false);
    expect(defaults.colophon?.summary?.startsWith("#")).toBe(false);
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

  it("declares the generator packages, and they survive validation", () => {
    // `generators` went away INERT (validated, layered, read by nothing) and
    // came back LOAD-BEARING: `scripts/build.ts` writes the literal import
    // specifiers and the whole `create` surface from it. The distribution config
    // goes through the same strict `parseRawConfig` as every layer, so this pins
    // that the field survives that validation rather than being stripped as an
    // unknown key — which would leave the build reading `undefined`.
    expect(defaults.generators?.map((generator) => generator.name)).toEqual([
      "@canonical/summon-component",
      "@canonical/summon-package",
      "@canonical/summon-application",
    ]);
    // It is DISTRIBUTION-ONLY: no config layer can change which modules an
    // already-compiled binary carries, so it never reaches the effective config.
    expect(defaults.generators).toBeDefined();
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
