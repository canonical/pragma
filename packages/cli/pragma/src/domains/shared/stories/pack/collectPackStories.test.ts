import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PragmaConfig } from "#config";
import { PragmaError } from "#error";
import { RECIPE_STORY } from "#testing";
import type { SemanticPackage } from "../../semanticPackage.js";
import { BUNDLED_PACKS } from "./bundled/index.js";
import realCollectPackStories from "./collectPackStories.js";
import {
  buildReservedVerbs,
  deriveReservedVerbs,
  isReserved,
  type ReservedVerbs,
} from "./reservedVerbs.js";

/**
 * Test wrapper that isolates the always-present bundled packs: unit tests
 * asserting exact entries pass `[]` so the default bundled `tier` pack does not
 * pollute their expectations. Bundled behavior is covered separately below.
 */
function collectPackStories(
  config: PragmaConfig,
  packages: readonly SemanticPackage[],
  reserved: ReservedVerbs,
): ReturnType<typeof realCollectPackStories> {
  return realCollectPackStories(config, packages, reserved, []);
}

function makePackage(stories: SemanticPackage["stories"]): SemanticPackage {
  return {
    name: "@canonical/example",
    version: "1.0.0",
    source: "local",
    graphs: [],
    skills: [],
    stories,
  };
}

const CONFIG = { tier: undefined, channel: "normal" as const };

// A representative slice of the real built-in surface: leaf read nouns that
// own `list`/`lookup`, plus operational nouns (graph, config, create, graphql,
// setup, tokens) that own neither and so must be reserved wholesale.
const BUILTIN_PAIRS: readonly (readonly [string, string | undefined])[] = [
  ["standard", "list"],
  ["standard", "lookup"],
  ["standard", "categories"],
  ["standard", "sample"],
  ["block", "list"],
  ["block", "lookup"],
  ["token", "list"],
  ["token", "lookup"],
  ["tier", "list"],
  ["config", "show"],
  ["config", "tier"],
  ["config", "channel"],
  ["graph", "query"],
  ["graph", "inspect"],
  ["create", "component"],
  ["create", "package"],
  ["graphql", "build"],
  ["graphql", "check"],
  ["graphql", "serve"],
  ["setup", "all"],
  ["setup", "lsp"],
  ["tokens", "add-config"],
  ["info", undefined],
];

/** Run a thunk and return the error it throws (or `undefined`). */
function caught(run: () => unknown): unknown {
  try {
    run();
  } catch (error) {
    return error;
  }
  return undefined;
}

describe("collectPackStories", () => {
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warn = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    warn.mockRestore();
  });

  it("collects config stories and validated package stories", () => {
    const entries = collectPackStories(
      { ...CONFIG, stories: [RECIPE_STORY] },
      [
        makePackage([
          {
            path: "/pkg/stories/other.json",
            definition: { ...RECIPE_STORY, noun: "other" },
          },
        ]),
      ],
      buildReservedVerbs([["block", undefined]]),
    );
    expect(entries.map((entry) => entry.definition.noun)).toEqual([
      "recipe",
      "other",
    ]);
    expect(entries.at(0)?.source).toBe("config");
    expect(entries.at(1)?.source).toBe("/pkg/stories/other.json");
  });

  it("lets config stories win noun collisions against packages", () => {
    const entries = collectPackStories(
      { ...CONFIG, stories: [RECIPE_STORY] },
      [
        makePackage([
          { path: "/pkg/stories/recipe.json", definition: RECIPE_STORY },
        ]),
      ],
      buildReservedVerbs([]),
    );
    expect(entries).toHaveLength(1);
    expect(entries.at(0)?.source).toBe("config");
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("already provided"),
    );
  });

  it("skips invalid package stories with a warning", () => {
    const entries = collectPackStories(
      CONFIG,
      [
        makePackage([
          { path: "/pkg/stories/broken.json", definition: { nope: true } },
        ]),
      ],
      buildReservedVerbs([]),
    );
    expect(entries).toHaveLength(0);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("skipping story"),
    );
  });

  it("throws when a config story shadows a built-in noun", () => {
    expect(() =>
      collectPackStories(
        { ...CONFIG, stories: [{ ...RECIPE_STORY, noun: "block" }] },
        [],
        buildReservedVerbs([["block", undefined]]),
      ),
    ).toThrow(PragmaError);
  });

  it("skips package stories that shadow built-in nouns", () => {
    const entries = collectPackStories(
      CONFIG,
      [
        makePackage([
          {
            path: "/pkg/stories/block.json",
            definition: { ...RECIPE_STORY, noun: "block" },
          },
        ]),
      ],
      buildReservedVerbs([["block", undefined]]),
    );
    expect(entries).toHaveLength(0);
  });

  it("admits a pack once its noun's verbs leave the reserved map", () => {
    // Post-migration simulation: `standard`'s list/lookup wrappers are gone,
    // so only categories/sample remain reserved — a `standard` pack (which
    // emits list + lookup) is now admissible. `info` is a bare (whole-noun)
    // built-in, so an `info` pack stays blocked. This is the keystone: the
    // per-verb guard makes the leaf cutover incremental.
    const reserved = buildReservedVerbs([
      ["standard", "categories"],
      ["standard", "sample"],
      ["info", undefined],
    ]);

    const entries = collectPackStories(
      CONFIG,
      [
        makePackage([
          {
            path: "/pkg/stories/standard.json",
            definition: { ...RECIPE_STORY, noun: "standard" },
          },
          {
            path: "/pkg/stories/info.json",
            definition: { ...RECIPE_STORY, noun: "info" },
          },
        ]),
      ],
      reserved,
    );

    expect(entries.map((entry) => entry.definition.noun)).toEqual(["standard"]);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("shadows built-in command"),
    );
  });

  // Regression restoration (FIX 1): operational nouns own no list/lookup, so
  // deriveReservedVerbs promotes them to a whole-noun reservation. Since a
  // pack always emits `list`, a pack targeting an operational namespace must
  // stay BLOCKED — this is the load-bearing proof that the per-verb flip did
  // not silently open pragma's core operational namespaces to packs.
  describe("operational nouns stay reserved wholesale", () => {
    const reserved = deriveReservedVerbs(BUILTIN_PAIRS);

    it("promotes every operational noun to a whole-noun reservation", () => {
      for (const noun of ["config", "graph", "create", "graphql", "setup"]) {
        expect(isReserved(reserved, noun, "list")).toBe(true);
      }
      // `tokens` (the plural add-config noun) owns only `add-config`.
      expect(isReserved(reserved, "tokens", "list")).toBe(true);
    });

    it("throws a config error when a config story shadows an operational noun", () => {
      const error = caught(() =>
        collectPackStories(
          { ...CONFIG, stories: [{ ...RECIPE_STORY, noun: "graph" }] },
          [],
          reserved,
        ),
      );
      expect(error).toBeInstanceOf(PragmaError);
      expect((error as PragmaError).code).toBe("CONFIG_ERROR");
    });

    it("skips a package story that shadows an operational noun", () => {
      const entries = collectPackStories(
        CONFIG,
        [
          makePackage([
            {
              path: "/pkg/stories/graph.json",
              definition: { ...RECIPE_STORY, noun: "graph" },
            },
          ]),
        ],
        reserved,
      );
      expect(entries).toHaveLength(0);
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining("shadows built-in command"),
      );
    });
  });

  // Keystone incremental window (FIX 3): `standard`'s `list` wrapper is
  // deleted but `lookup` is still built-in (alongside categories/sample).
  describe("incremental leaf cutover window", () => {
    const reserved = deriveReservedVerbs([
      ["standard", "lookup"],
      ["standard", "categories"],
      ["standard", "sample"],
      ["info", undefined],
    ]);

    it("keeps `standard` per-verb because it still owns lookup (not promoted)", () => {
      // Disjointness check: the noun retains a read verb, so it must NOT be
      // wholesale-promoted — otherwise `list` could never be freed.
      expect(isReserved(reserved, "standard", "list")).toBe(false);
      expect(isReserved(reserved, "standard", "lookup")).toBe(true);
    });

    it("admits a standard pack that declares only list", () => {
      const listOnly = { ...RECIPE_STORY, noun: "standard", lookup: undefined };
      const entries = collectPackStories(
        CONFIG,
        [
          makePackage([
            { path: "/pkg/stories/standard.json", definition: listOnly },
          ]),
        ],
        reserved,
      );
      expect(entries.map((entry) => entry.definition.noun)).toEqual([
        "standard",
      ]);
    });

    it("rejects a standard pack that also declares lookup (config throws)", () => {
      const error = caught(() =>
        collectPackStories(
          { ...CONFIG, stories: [{ ...RECIPE_STORY, noun: "standard" }] },
          [],
          reserved,
        ),
      );
      expect(error).toBeInstanceOf(PragmaError);
      expect((error as PragmaError).code).toBe("CONFIG_ERROR");
    });

    it("rejects a standard pack that also declares lookup (package skips)", () => {
      const entries = collectPackStories(
        CONFIG,
        [
          makePackage([
            {
              path: "/pkg/stories/standard.json",
              definition: { ...RECIPE_STORY, noun: "standard" },
            },
          ]),
        ],
        reserved,
      );
      expect(entries).toHaveLength(0);
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining("shadows built-in command"),
      );
    });
  });

  // Bundled transitional packs use the REAL collect (not the isolating wrapper).
  describe("bundled packs", () => {
    it("includes bundled packs by default, lowest precedence", () => {
      const entries = realCollectPackStories(
        CONFIG,
        [],
        buildReservedVerbs([]),
      );
      const nouns = entries.map((entry) => entry.definition.noun);
      // Every bundled pack is present, tagged with a `bundled:` source.
      for (const pack of BUNDLED_PACKS) {
        expect(nouns).toContain(pack.noun);
        const entry = entries.find((e) => e.definition.noun === pack.noun);
        expect(entry?.source).toBe(`bundled:${pack.noun}`);
      }
    });

    it("lets a config story override a bundled noun (config wins)", () => {
      const bundledNoun = BUNDLED_PACKS[0]?.noun ?? "tier";
      const entries = realCollectPackStories(
        { ...CONFIG, stories: [{ ...RECIPE_STORY, noun: bundledNoun }] },
        [],
        buildReservedVerbs([]),
      );
      const entry = entries.find((e) => e.definition.noun === bundledNoun);
      // The config-declared story wins; the bundled one yields silently.
      expect(entry?.source).toBe("config");
      expect(
        entries.filter((e) => e.definition.noun === bundledNoun),
      ).toHaveLength(1);
    });

    it("yields a bundled noun to a still-reserved built-in", () => {
      // If a bundled noun is still a built-in (not yet cut over), the bundled
      // pack must not shadow it.
      const bundledNoun = BUNDLED_PACKS[0]?.noun ?? "tier";
      const entries = realCollectPackStories(
        CONFIG,
        [],
        buildReservedVerbs([[bundledNoun, undefined]]),
      );
      expect(entries.map((e) => e.definition.noun)).not.toContain(bundledNoun);
    });
  });
});
