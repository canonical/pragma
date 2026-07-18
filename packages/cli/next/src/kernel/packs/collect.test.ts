/**
 * Dynamic pack precedence + uniqueness (PROTECTED).
 *
 * Default config ⇒ effective == static (the golden holds, no config read cost on
 * the fast path). A config story overrides a bundled-pack noun or introduces a
 * new one; a story claiming a non-pack authored noun, a duplicate noun, or any
 * surviving `(noun, verb)` collision is rejected.
 */

import { describe, expect, it } from "vitest";
import type { ConfigLayers } from "../config/types.js";
import type { CapabilityModule, VerbSpec } from "../spec/types.js";
import { assembleEffectiveModules } from "./collect.js";
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
  { name: "standard", verbs: [fakeVerb("standard", "list")] },
];

function layers(stories: unknown[]): ConfigLayers {
  return {
    config: { channel: "normal", stories },
    origins: {
      tier: "default",
      channel: "default",
      detail: "default",
      packages: "default",
      stories: stories.length > 0 ? "project" : "default",
      prefixes: "default",
      prompts: "default",
    },
    global: { path: "", exists: false },
    project: { exists: false },
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

  it("a config story overrides a bundled-pack noun", () => {
    const effective = assembleEffectiveModules(
      STATIC,
      layers([validPack("standard")]),
    );
    const standard = effective.find((m) => m.name === "standard");
    // The bundled `standard` module was replaced by the config pack (source
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

  it("rejects a story claiming a non-pack authored noun", () => {
    expect(() =>
      assembleEffectiveModules(STATIC, layers([validPack("config")])),
    ).toThrow(/built-in command/);
  });

  it("rejects a duplicate story noun", () => {
    expect(() =>
      assembleEffectiveModules(
        STATIC,
        layers([validPack("recipe"), validPack("recipe")]),
      ),
    ).toThrow(/Duplicate/);
  });

  it("rejects an invalid story pack (via the zod validator)", () => {
    expect(() =>
      assembleEffectiveModules(STATIC, layers([{ noun: "Bad Noun" }])),
    ).toThrow(/Invalid story/);
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
