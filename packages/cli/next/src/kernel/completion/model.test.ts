import { describe, expect, it } from "vitest";
import { capabilities } from "../../capabilities/index.js";
import { completionFixture } from "../../testing/fixtures/completionFixture.js";
import { emitSurface } from "../spec/emitSurface.js";
import type { CapabilityModule, ParamSpec, VerbSpec } from "../spec/types.js";
import { assertSafeToken, buildCompletionModel, findNoun } from "./model.js";
import type { CompletionModel, VerbEntry } from "./types.js";

const model = buildCompletionModel([completionFixture]);

/** A minimal module with one verb, for adversarial name tests. */
function moduleWith(overrides: Partial<VerbSpec>): CapabilityModule {
  const verb: VerbSpec = {
    path: ["thing"],
    summary: "Test verb.",
    params: [],
    output: {
      formatters: {
        plain: () => "",
        llm: () => "",
        json: () => "null",
      },
    },
    capability: {
      needsStore: false,
      mutates: false,
      mcp: { expose: false, reason: "test" },
    },
    run: async () => null,
    ...overrides,
  };
  return { name: "adversarial", verbs: [verb] };
}

describe("buildCompletionModel — structure", () => {
  it("collects nouns sorted, injecting the bin-served mcp", () => {
    expect(model.nouns.map((n) => n.noun)).toEqual([
      "block",
      "mcp",
      "standard",
      "status",
    ]);
  });

  it("excludes hidden verbs", () => {
    const block = findNoun(model, "block");
    expect(block?.verbs.map((v) => v.label)).toEqual([
      "diff",
      "get",
      "list",
      "remove",
    ]);
  });

  it("separates self-verbs from sub-verbs", () => {
    const standard = findNoun(model, "standard");
    expect(standard?.selfVerb?.label).toBe("standard");
    expect(standard?.verbs.map((v) => v.label)).toEqual(["list"]);

    const status = findNoun(model, "status");
    expect(status?.selfVerb?.label).toBe("status");
    expect(status?.verbs).toEqual([]);
  });

  it("injects mcp as a bare self-verb noun with nothing to offer", () => {
    const mcp = findNoun(model, "mcp");
    expect(mcp?.selfVerb).toEqual({
      label: "mcp",
      mutates: false,
      flags: [],
      positionals: [],
    });
  });

  it("does not inject mcp when a live mcp noun exists", () => {
    const withMcp = buildCompletionModel([
      moduleWith({ path: ["mcp", "serve"] }),
    ]);
    const mcp = findNoun(withMcp, "mcp");
    expect(mcp?.selfVerb).toBeUndefined();
    expect(mcp?.verbs.map((v) => v.label)).toEqual(["serve"]);
  });
});

describe("buildCompletionModel — flags and sources", () => {
  const get = findNoun(model, "block")?.verbs.find((v) => v.label === "get");

  it("kebab-cases flag names and marks boolean flags valueless", () => {
    const withMeta = get?.flags.find((f) => f.flag === "--with-meta");
    expect(withMeta).toMatchObject({
      takesValue: false,
      repeatable: false,
      source: { kind: "none" },
    });
  });

  it("defaults an enum flag to its values source", () => {
    const view = get?.flags.find((f) => f.flag === "--view");
    expect(view).toMatchObject({
      takesValue: true,
      source: { kind: "values", values: ["anatomy", "full", "summary"] },
    });
  });

  it("resolves declared files / none sources", () => {
    expect(get?.flags.find((f) => f.flag === "--out")?.source).toEqual({
      kind: "files",
    });
    expect(get?.flags.find((f) => f.flag === "--note")?.source).toEqual({
      kind: "none",
    });
  });

  it("marks string[] flags repeatable", () => {
    const list = findNoun(model, "block")?.verbs.find(
      (v) => v.label === "list",
    );
    expect(list?.flags.find((f) => f.flag === "--tags")).toMatchObject({
      takesValue: true,
      repeatable: true,
    });
  });

  it("resolves name positionals with required/variadic markers", () => {
    expect(get?.positionals).toEqual([
      {
        name: "ref",
        required: true,
        variadic: false,
        source: {
          kind: "names",
          ref: { from: "index", type: "ds:Block" },
          match: "substring",
          caseSensitive: false,
        },
      },
    ]);
    const diff = findNoun(model, "block")?.verbs.find(
      (v) => v.label === "diff",
    );
    expect(diff?.positionals[0]).toMatchObject({
      variadic: true,
      source: {
        kind: "names",
        ref: { from: "index", type: "ds:Block" },
      },
    });
  });

  it("resolves a declared values positional and a defaulted enum positional", () => {
    const list = findNoun(model, "block")?.verbs.find(
      (v) => v.label === "list",
    );
    expect(list?.positionals[0]?.source).toEqual({
      kind: "values",
      values: ["community", "core"],
    });
    const status = findNoun(model, "status")?.selfVerb;
    expect(status?.positionals[0]?.source).toEqual({
      kind: "values",
      values: ["all", "dirty"],
    });
  });

  it("treats a {values} declaration on a non-enum param as none", () => {
    const bad = buildCompletionModel([
      moduleWith({
        params: [
          {
            kind: "string",
            name: "q",
            doc: "q",
            positional: true,
            complete: { kind: "values" },
          },
        ],
      }),
    ]);
    expect(findNoun(bad, "thing")?.selfVerb?.positionals[0]?.source).toEqual({
      kind: "none",
    });
  });

  it("carries a names heuristic's match + caseSensitive, defaulting both", () => {
    const built = buildCompletionModel([
      moduleWith({
        params: [
          {
            kind: "string",
            name: "q",
            doc: "q",
            positional: true,
            complete: {
              kind: "names",
              source: { from: "skills" },
              match: "prefix",
              caseSensitive: true,
            },
          },
        ],
      }),
    ]);
    expect(findNoun(built, "thing")?.selfVerb?.positionals[0]?.source).toEqual({
      kind: "names",
      ref: { from: "skills" },
      match: "prefix",
      caseSensitive: true,
    });
    // Defaults when unspecified: substring + case-insensitive.
    const defaulted = buildCompletionModel([
      moduleWith({
        params: [
          {
            kind: "string",
            name: "q",
            doc: "q",
            positional: true,
            complete: { kind: "names", source: { from: "prefixes" } },
          },
        ],
      }),
    ]);
    expect(
      findNoun(defaulted, "thing")?.selfVerb?.positionals[0]?.source,
    ).toMatchObject({ match: "substring", caseSensitive: false });
  });

  it("resolves an opted-out (enabled:false) names heuristic to none", () => {
    const built = buildCompletionModel([
      moduleWith({
        params: [
          {
            kind: "string",
            name: "q",
            doc: "q",
            positional: true,
            complete: {
              kind: "names",
              source: { from: "tiers" },
              enabled: false,
            },
          },
        ],
      }),
    ]);
    expect(findNoun(built, "thing")?.selfVerb?.positionals[0]?.source).toEqual({
      kind: "none",
    });
  });

  it("marks the mutating verb and carries the mutation flag set", () => {
    const remove = findNoun(model, "block")?.verbs.find(
      (v) => v.label === "remove",
    );
    expect(remove?.mutates).toBe(true);
    expect(model.mutationFlags.map((f) => f.flag)).toEqual([
      "--dry-run",
      "--undo",
      "--yes",
    ]);
  });

  it("models global flags with their value sources and --version rootOnly", () => {
    const flags = Object.fromEntries(model.globalFlags.map((f) => [f.flag, f]));
    expect(flags["--format"]?.source).toEqual({
      kind: "values",
      values: ["plain", "json"],
    });
    expect(flags["--detail"]?.source).toEqual({
      kind: "values",
      values: ["summary", "standard", "detailed"],
    });
    expect(flags["--llm"]?.takesValue).toBe(false);
    expect(flags["--version"]?.rootOnly).toBe(true);
    expect(flags["--help"]?.rootOnly).toBeUndefined();
  });
});

describe("buildCompletionModel — safety assertion", () => {
  it("throws on a hostile noun", () => {
    expect(() =>
      buildCompletionModel([moduleWith({ path: ['x"; rm -rf ~'] })]),
    ).toThrow(/unsafe token/);
  });

  it("throws on a hostile verb label", () => {
    expect(() =>
      buildCompletionModel([moduleWith({ path: ["thing", "a;b"] })]),
    ).toThrow(/unsafe token/);
  });

  it("throws on a hostile enum value", () => {
    expect(() =>
      buildCompletionModel([
        moduleWith({
          params: [
            {
              kind: "enum",
              name: "mode",
              doc: "mode",
              values: ["ok", "$(rm -rf ~)"],
            },
          ],
        }),
      ]),
    ).toThrow(/unsafe token/);
  });

  it("throws on a flag name that kebab-cases to an unsafe token", () => {
    expect(() =>
      buildCompletionModel([
        moduleWith({
          params: [{ kind: "string", name: "bad name", doc: "bad" }],
        }),
      ]),
    ).toThrow(/unsafe token/);
  });

  it("assertSafeToken accepts URI-ish names and rejects shell syntax", () => {
    expect(() => assertSafeToken("ds:Block", "test")).not.toThrow();
    expect(() => assertSafeToken("button-group", "test")).not.toThrow();
    expect(() => assertSafeToken("a`b`", "test")).toThrow(/unsafe token/);
    expect(() => assertSafeToken("-x", "test")).toThrow(/unsafe token/);
    expect(() => assertSafeToken("", "test")).toThrow(/unsafe token/);
  });
});

/** Rebuild a surface `args` token from a completion positional entry. */
function positionalToken(entry: {
  name: string;
  required: boolean;
  variadic: boolean;
}): string {
  const variadic = entry.variadic ? "..." : "";
  return entry.required
    ? `<${entry.name}${variadic}>`
    : `[${entry.name}${variadic}]`;
}

/** Assert the model is structurally the same projection as emitSurface. */
function expectAgreement(
  modules: readonly CapabilityModule[],
  completionModel: CompletionModel,
): void {
  const surface = emitSurface(modules);

  const surfaceNouns = Object.keys(surface.nouns).sort();
  const modelNouns = completionModel.nouns
    .map((n) => n.noun)
    .filter((noun) => noun !== "mcp" || surfaceNouns.includes("mcp"));
  expect(modelNouns).toEqual(surfaceNouns);

  for (const noun of surfaceNouns) {
    const nounEntry = findNoun(completionModel, noun);
    expect(nounEntry).toBeDefined();
    if (!nounEntry) continue;

    const surfaceVerbs = surface.nouns[noun]?.verbs ?? [];
    const modelLabels = [
      ...(nounEntry.selfVerb ? [nounEntry.selfVerb.label] : []),
      ...nounEntry.verbs.map((v) => v.label),
    ].sort();
    expect(modelLabels).toEqual(surfaceVerbs.map((v) => v.v).sort());

    for (const surfaceVerb of surfaceVerbs) {
      const modelVerb: VerbEntry | undefined =
        nounEntry.selfVerb?.label === surfaceVerb.v
          ? nounEntry.selfVerb
          : nounEntry.verbs.find((v) => v.label === surfaceVerb.v);
      expect(modelVerb).toBeDefined();
      if (!modelVerb) continue;

      expect(modelVerb.flags.map((f) => f.flag)).toEqual(
        surfaceVerb.flags ?? [],
      );
      expect(modelVerb.positionals.map(positionalToken)).toEqual(
        surfaceVerb.args ?? [],
      );
      expect(modelVerb.mutates).toBe(surfaceVerb.mutates === true);
    }
  }
}

describe("projection agreement with emitSurface (PROTECTED)", () => {
  it("the fixture model matches the fixture surface (hidden excluded)", () => {
    expectAgreement([completionFixture], model);
    const emitted = emitSurface([completionFixture]);
    expect(JSON.stringify(emitted)).not.toContain("probe");
  });

  it("the live model matches the live surface", () => {
    expectAgreement(capabilities, buildCompletionModel(capabilities));
  });
});

/** Regression pin: ParamSpec.complete stays optional on every param kind. */
it("accepts params without a complete field", () => {
  const params: ParamSpec[] = [
    { kind: "string", name: "a", doc: "a" },
    { kind: "number", name: "b", doc: "b" },
  ];
  const built = buildCompletionModel([moduleWith({ params })]);
  const flags = findNoun(built, "thing")?.selfVerb?.flags;
  expect(flags?.map((f) => f.source.kind)).toEqual(["none", "none"]);
});
