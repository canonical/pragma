// =============================================================================
// The collector, against the hermetic corpus.
//
// Every property here was previously untestable: the app's `collectTtlSources`
// read `$PRAGMA_REFS_DIR` internally, so exercising it meant having a populated
// pragma refs cache — which no CI leg and no fresh clone has. Roots are now an
// argument and the corpus is checked in, so these are ordinary unit tests.
//
// 🔴 NOTHING IN THIS FILE WRITES. `collectTtlSources` reads; the SDL write
// lives behind `createPragmaProvider`'s optional `sdlOutput`, which no test in
// this package ever passes. Pointing a root at a real ontology tree is safe
// here for exactly that reason — see `createPragmaProvider.ts`'s header.
// =============================================================================

import { describe, expect, it, vi } from "vitest";
import {
  CORPUS_EMPTY_REFS_ROOT,
  CORPUS_REFS_ROOT,
  CORPUS_SEM_ROOT,
  MISSING_ROOT,
} from "../../testing/corpus.js";
import { DEFAULT_REFS_ROOT, DEFAULT_SEM_ROOT } from "../config/index.js";
import {
  collectTtlSources,
  escapeChannelDottedRefs,
  resolveRefsRoot,
  resolveSemRoot,
} from "./collectTtlSources.js";

const bothRoots = { refsRoot: CORPUS_REFS_ROOT, semRoot: CORPUS_SEM_ROOT };

describe("collectTtlSources over both roots", () => {
  const paths = collectTtlSources(bothRoots).map((source) => source.path);

  it("collects both roots into one ordered set", () => {
    // The whole list, pinned. A new corpus file that nothing asserts on is a
    // fixture nobody is reading; this makes adding one a deliberate act.
    expect(paths).toStrictEqual([
      "anatomy-dsl/definitions/anatomy.ttl",
      "design-system/data/instances.ttl",
      "design-system/data/tokens/colors.ttl",
      "design-system/definitions/ontology.ttl",
      "surface/definitions/surface.ttl",
    ]);
  });

  it("skips dot-prefixed files", () => {
    // `.channel.ttl` is an experimental-channel artifact, not a graph source.
    expect(paths.some((path) => path.includes(".channel"))).toBe(false);
    expect(
      collectTtlSources(bothRoots).some((source) =>
        source.content.includes("ds:leaked"),
      ),
    ).toBe(false);
  });

  it("skips files that are not .ttl", () => {
    expect(paths.some((path) => path.endsWith(".md"))).toBe(false);
  });

  it("descends into nested directories", () => {
    expect(paths).toContain("design-system/data/tokens/colors.ttl");
  });

  it("drops EXCLUDED_SOURCES by its store-visible path", () => {
    // The file is on disk under the sem root; the constant names it; the
    // collected set must not carry it. This is the shim-concept exclusion —
    // `ds:embodiesConcept rdfs:domain ds:Entity` would smear two fields onto
    // every subclass of `ds:Entity` the moment both roots compile together.
    expect(paths).not.toContain("design-system-docs/data/shim-concept.ttl");
    expect(
      collectTtlSources(bothRoots).some((source) =>
        source.content.includes("embodiesConcept"),
      ),
    ).toBe(false);
  });

  it("tolerates a ref package that is not in the cache", () => {
    // `code-standards` is in REF_PACKAGES and absent from the corpus — the
    // state a partially-populated cache is actually in. It contributes
    // nothing and throws nothing.
    expect(paths.some((path) => path.startsWith("code-standards/"))).toBe(
      false,
    );
  });

  it("escapes channel-dotted references in the content it hands the store", () => {
    const instances = collectTtlSources(bothRoots).find(
      (source) => source.path === "design-system/data/instances.ttl",
    );
    expect(instances?.content).toContain("ds:\\.subcomponent.button-label");
  });
});

describe("collectTtlSources without the semantics tree", () => {
  const paths = collectTtlSources({
    refsRoot: CORPUS_REFS_ROOT,
    semRoot: MISSING_ROOT,
  }).map((source) => source.path);

  it("skips the second root entirely rather than failing", () => {
    // The four shipped lenses read the first root only, so an absent
    // semantics tree must degrade, not break.
    expect(paths).not.toContain("surface/definitions/surface.ttl");
  });

  it("still collects the first root", () => {
    expect(paths).toStrictEqual([
      "anatomy-dsl/definitions/anatomy.ttl",
      "design-system/data/instances.ttl",
      "design-system/data/tokens/colors.ttl",
      "design-system/definitions/ontology.ttl",
    ]);
  });
});

describe("collectTtlSources when the cache is unusable", () => {
  it("throws an actionable message when the refs root is missing", () => {
    expect(() =>
      collectTtlSources({ refsRoot: MISSING_ROOT, semRoot: CORPUS_SEM_ROOT }),
    ).toThrow(/pragma refs cache not found at .*— run `pragma sources update`/);
  });

  it("throws a DIFFERENT message when the refs root is present but empty", () => {
    // Distinguishable on purpose: "not there" and "there but you have not run
    // the update" are different mistakes with the same remedy, and a single
    // message would send someone looking for a directory that exists.
    expect(() =>
      collectTtlSources({
        refsRoot: CORPUS_EMPTY_REFS_ROOT,
        semRoot: CORPUS_SEM_ROOT,
      }),
    ).toThrow(/no \.ttl sources found under /);
  });
});

describe("escapeChannelDottedRefs", () => {
  it("escapes a dot-leading local name", () => {
    expect(escapeChannelDottedRefs("ex:.foo")).toBe("ex:\\.foo");
  });

  it("leaves an ordinary prefixed name alone", () => {
    expect(escapeChannelDottedRefs("ex:foo.bar")).toBe("ex:foo.bar");
  });

  it("leaves a dot that begins no local name alone", () => {
    // The trailing statement dot, and a dot followed by a non-name character.
    expect(escapeChannelDottedRefs("ex:foo .\nex:.9bad")).toBe(
      "ex:foo .\nex:.9bad",
    );
  });
});

describe("root resolution", () => {
  it("prefers PRAGMA_REFS_DIR over the cache default", () => {
    vi.stubEnv("PRAGMA_REFS_DIR", CORPUS_REFS_ROOT);
    expect(resolveRefsRoot()).toBe(CORPUS_REFS_ROOT);
    vi.unstubAllEnvs();
  });

  it("falls back to the pragma CLI's cache location", () => {
    vi.stubEnv("PRAGMA_REFS_DIR", undefined);
    expect(resolveRefsRoot()).toBe(DEFAULT_REFS_ROOT);
    vi.unstubAllEnvs();
  });

  it("prefers PRAGMA_SEM_DIR over the working-tree default", () => {
    vi.stubEnv("PRAGMA_SEM_DIR", CORPUS_SEM_ROOT);
    expect(resolveSemRoot()).toBe(CORPUS_SEM_ROOT);
    vi.unstubAllEnvs();
  });

  it("falls back to the sibling semantics working tree", () => {
    vi.stubEnv("PRAGMA_SEM_DIR", undefined);
    expect(resolveSemRoot()).toBe(DEFAULT_SEM_ROOT);
    vi.unstubAllEnvs();
  });
});
