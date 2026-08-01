/**
 * Dynamic pack precedence + uniqueness (PROTECTED).
 *
 * Default config ⇒ effective == static (the golden holds, no config read cost on
 * the fast path, and the distribution's own declarations are compiled exactly
 * once). A config story overrides a story-backed noun or introduces a new one;
 * a story claiming an authored non-story noun, a duplicate noun within one
 * config tier, or any surviving `(noun, verb)` collision is rejected. Across the
 * two config tiers the closer declaration WINS rather than erroring.
 */

import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { capabilities } from "../../capabilities/index.js";
import type { ConfigLayers } from "../config/types.js";
import type { CapabilityModule, VerbSpec } from "../spec/types.js";
import {
  assembleEffectiveModules,
  loadEffectiveModules,
  validateStories,
} from "./collect.js";
import { assertUniqueVerbs } from "./uniqueness.js";

/** A trivial storeless verb for a fake authored module. */
function fakeVerb(noun: string, verb?: string): VerbSpec {
  return {
    path: verb ? [noun, verb] : [noun],
    summary: `${noun} ${verb ?? ""}`.trim(),
    params: [],
    output: {
      formatters: { plain: () => "", llm: () => "", json: () => "{}" },
    },
    capability: {
      needsStore: false,
      mutates: false,
      mcp: { expose: false, reason: "fake" },
    },
    run: async () => ({}),
  };
}

const STATIC: CapabilityModule[] = [
  { name: "config", verbs: [fakeVerb("config", "show")] },
  // `story: true` marks a module compiled from a declared story — the ONLY
  // kind a config/package story may replace.
  { name: "standard", story: true, verbs: [fakeVerb("standard", "list")] },
];

function layers(stories: unknown[]): ConfigLayers {
  return {
    config: { channel: "normal", stories },
    origins: {
      tier: "default",
      channel: "default",
      detail: "default",
      packs: "default",
      stories: stories.length > 0 ? "project" : "default",
      prefixes: "default",
    },
    global: { path: "", exists: false },
    project: { exists: false },
  };
}

/**
 * Config layers where the PROJECT declares `packs`, with stories on the pack
 * entry and optionally at the top level (the stronger tier).
 */
function packLayers(
  packStories: unknown[],
  topLevel: unknown[] = [],
): ConfigLayers {
  const base = layers(topLevel);
  return {
    ...base,
    config: {
      ...base.config,
      packs: [
        { name: "recipes", source: "file:///recipes", stories: packStories },
      ],
    },
    origins: { ...base.origins, packs: "project" },
  };
}

const validPack = (noun: string) => ({
  noun,
  list: {
    query: "SELECT ?uri WHERE { ?uri a ex:Thing }",
    columns: [{ field: "uri" }],
  },
});

describe("assembleEffectiveModules (PROTECTED)", () => {
  it("default config (no stories) returns the static modules unchanged", () => {
    expect(assembleEffectiveModules(STATIC, layers([]))).toBe(STATIC);
  });

  it("a config story overrides a story-backed noun", () => {
    const effective = assembleEffectiveModules(
      STATIC,
      layers([validPack("standard")]),
    );
    const standard = effective.find((m) => m.name === "standard");
    // The static `standard` module was replaced by the config pack (source
    // "config"); it still owns exactly `standard list`.
    expect(standard?.verbs.map((v) => v.path.join(" "))).toEqual([
      "standard list",
    ]);
    expect(effective.filter((m) => m.name === "standard")).toHaveLength(1);
  });

  it("a config story introduces a new noun", () => {
    const effective = assembleEffectiveModules(
      STATIC,
      layers([validPack("recipe")]),
    );
    expect(effective.map((m) => m.name).sort()).toEqual([
      "config",
      "recipe",
      "standard",
    ]);
  });

  it("carries a config story's colophon onto its module (for `pragma colophon`)", () => {
    const effective = assembleEffectiveModules(
      STATIC,
      layers([{ ...validPack("recipe"), colophon: "How recipes are made." }]),
    );
    const recipe = effective.find((m) => m.name === "recipe");
    expect(recipe?.colophon).toBe("How recipes are made.");
    // A story without a colophon carries `undefined` (the field is optional).
    const plain = assembleEffectiveModules(STATIC, layers([validPack("stew")]));
    expect(plain.find((m) => m.name === "stew")?.colophon).toBeUndefined();
  });

  it("rejects a story claiming an authored non-story noun", () => {
    expect(() =>
      assembleEffectiveModules(STATIC, layers([validPack("config")])),
    ).toThrow(/built-in command/);
  });

  it("rejects a duplicate story noun within one config tier", () => {
    expect(() =>
      assembleEffectiveModules(
        STATIC,
        layers([validPack("recipe"), validPack("recipe")]),
      ),
    ).toThrow(/Duplicate/);
  });

  it("a story declared on a config pack contributes its noun", () => {
    const effective = assembleEffectiveModules(
      STATIC,
      packLayers([validPack("recipe")]),
    );
    expect(effective.map((m) => m.name).sort()).toEqual([
      "config",
      "recipe",
      "standard",
    ]);
  });

  it("the top-level stories tier overrides packs[].stories for one noun", () => {
    // Two config sources naming one noun is a REFINEMENT, not a conflict: the
    // more specific (top-level) declaration wins and nothing throws.
    const effective = assembleEffectiveModules(
      STATIC,
      packLayers(
        [{ ...validPack("recipe"), colophon: "declared on the pack" }],
        [{ ...validPack("recipe"), colophon: "declared by the project" }],
      ),
    );
    expect(effective.filter((m) => m.name === "recipe")).toHaveLength(1);
    expect(effective.find((m) => m.name === "recipe")?.colophon).toBe(
      "declared by the project",
    );
  });

  it("rejects an invalid story pack (via the zod validator)", () => {
    expect(() =>
      assembleEffectiveModules(STATIC, layers([{ noun: "Bad Noun" }])),
    ).toThrow(/Invalid story/);
  });
});

describe("validateStories — package stories NEVER throw (PROTECTED)", () => {
  const record = (source: string, content: string) => ({ source, content });

  it("drops an unparseable AND a schema-invalid story, keeping the valid one", () => {
    // Both bad shapes in ONE case, deliberately: guarding the malformed file
    // and letting the schema-invalid one through is exactly how a third-party
    // story once bricked every command, `sources update` and `doctor` included.
    const result = validateStories(
      [
        record("pkg/stories/broken.json", "{ not json"),
        record("pkg/stories/invalid.json", '{"noun":"Bad Noun","list":{}}'),
        record("pkg/stories/recipe.json", JSON.stringify(validPack("recipe"))),
      ],
      STATIC,
    );
    expect(result.entries.map((entry) => entry.definition.noun)).toEqual([
      "recipe",
    ]);
    expect(result.problems.map((problem) => problem.source)).toEqual([
      "pkg/stories/broken.json",
      "pkg/stories/invalid.json",
    ]);
  });

  it("last declaration wins for a noun, and the shadowed file is reported", () => {
    const result = validateStories(
      [
        record("a/stories/recipe.json", JSON.stringify(validPack("recipe"))),
        record(
          "b/stories/recipe.json",
          JSON.stringify({ ...validPack("recipe"), colophon: "from b" }),
        ),
      ],
      STATIC,
    );
    expect(result.entries).toHaveLength(1);
    expect(result.entries.at(0)?.source).toBe("b/stories/recipe.json");
    expect(result.problems.at(0)?.source).toBe("a/stories/recipe.json");
  });

  it("refuses ANY noun the CLI already ships, without throwing", () => {
    // Authored (`config`) and story-backed (`standard`) alike. A package may
    // only ADD a noun: `assembleEffectiveModules` replaces a noun WHOLESALE, so
    // a package claiming `standard` would swap this distribution's code-standard
    // reads for its own in a project that did nothing but declare a dependency.
    // Overriding a shipped noun stays a config decision.
    const result = validateStories(
      [
        record("pkg/stories/config.json", JSON.stringify(validPack("config"))),
        record(
          "pkg/stories/standard.json",
          JSON.stringify(validPack("standard")),
        ),
      ],
      STATIC,
    );
    expect(result.entries).toEqual([]);
    expect(result.problems.map((problem) => problem.message)).toEqual([
      'its noun "config" is a command this CLI already ships and cannot be replaced by a package.',
      'its noun "standard" is a command this CLI already ships and cannot be replaced by a package.',
    ]);
  });

  it("leaves a declared noun's shipped verbs intact against a package claim", () => {
    // The real registry, not a fixture. `token` used to be a COMPOSITE and this
    // case guarded its hand-written `add-config` mutation; L-OPEN-9 removed that
    // verb, so the same package-claim mechanics are now asserted against the
    // story's own verbs — which is the case that still matters, since after the
    // removal EVERY data noun is story-backed and a wholesale replacement is the
    // only way one could be lost.
    const before = capabilities.find((module) => module.name === "token");
    expect(before?.verbs.map((verb) => verb.path.join(" "))).toEqual([
      "token list",
      "token lookup",
      "token sample",
    ]);
    const { entries, problems } = validateStories(
      [record("pkg/stories/token.json", JSON.stringify(validPack("token")))],
      capabilities,
    );
    expect(entries).toEqual([]);
    expect(problems.at(0)?.source).toBe("pkg/stories/token.json");
    const after = assembleEffectiveModules(capabilities, layers([]), entries);
    expect(
      after
        .find((module) => module.name === "token")
        ?.verbs.map((verb) => verb.path.join(" ")),
    ).toEqual(before?.verbs.map((verb) => verb.path.join(" ")));
  });

  it("a config story still REPLACES a package one for the same noun", () => {
    const { entries } = validateStories(
      [record("pkg/stories/recipe.json", JSON.stringify(validPack("recipe")))],
      STATIC,
    );
    const effective = assembleEffectiveModules(
      STATIC,
      layers([{ ...validPack("recipe"), colophon: "from the project" }]),
      entries,
    );
    expect(effective.filter((m) => m.name === "recipe")).toHaveLength(1);
    expect(effective.find((m) => m.name === "recipe")?.colophon).toBe(
      "from the project",
    );
  });
});

describe("the default layer's stories are compiled exactly once (PROTECTED)", () => {
  it("a fresh cwd's effective modules ARE the static capabilities", async () => {
    // `pragma.conf.ts` declares the distribution's own stories on its packs,
    // and `capabilities/distribution.ts` has already compiled them into the
    // static set — that is what keeps those nouns on the `--help`/`__complete`
    // fast path. Re-merging them at dispatch would recompile and re-validate
    // them on every command, and would put the distribution's own declarations
    // behind a validator whose failure is fatal. Identity (`toBe`), not
    // equality, is the assertion: nothing was rebuilt.
    const cwd = mkdtempSync(join(tmpdir(), "pragma-carve-out-"));
    const { modules, problems } = await loadEffectiveModules(capabilities, cwd);
    expect(modules).toBe(capabilities);
    // The embedded snapshot carries no package stories, so nothing to report.
    expect(problems).toEqual([]);
  });
});

describe("assertUniqueVerbs (PROTECTED)", () => {
  it("passes disjoint verbs and catches a collision", () => {
    expect(() =>
      assertUniqueVerbs([fakeVerb("a", "list"), fakeVerb("b", "list")]),
    ).not.toThrow();
    expect(() =>
      assertUniqueVerbs([fakeVerb("a", "list"), fakeVerb("a", "list")]),
    ).toThrow(/duplicate command "a list"/);
  });
});
