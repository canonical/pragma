/**
 * The `implementation` story's SEMANTICS, in-process through the real CLI
 * dispatch path (`executeVerb`), against the canonical fixture.
 *
 * The generic live-surface tests call `implementation_list` with empty
 * parameters and check the envelope, so they stay green whether or not the
 * story means anything: the block-name join could resolve to the wrong subject,
 * the IRI fallback could never fire, and `--platform` / `--library` could
 * filter nothing at all. Those are the four claims the noun actually makes, so
 * they are pinned here rather than left to the envelope.
 *
 * The join is the reason this noun exists and the reason it is worth a
 * fixture-backed test: `ds:implementsBlock` points from an implementation
 * collected in THIS repository at a block declared by a DIFFERENT pack, and the
 * row's `block` column is the design system's own `ds:name` reached across that
 * edge — not a string this repository holds anywhere.
 */

import { afterAll, describe, expect, it } from "vitest";
import { storyModules } from "../../capabilities/distribution.js";
import { verbKey } from "../../kernel/packs/uniqueness.js";
import { executeVerb } from "../../kernel/project/cli/dispatch.js";
import { bootRuntime } from "../../kernel/runtime/boot.js";
import type { VerbSpec } from "../../kernel/spec/types.js";
import {
  CANONICAL_CONFIG,
  CANONICAL_TTL,
} from "../fixtures/graph/canonical.js";
import {
  bootFixtureRuntime,
  type FixtureGraph,
} from "../helpers/fixtureGraph.js";
import { JSON_FLAGS, NO_MUTATION } from "../helpers/parity.js";

const implementationModule = storyModules.get("implementation");
if (!implementationModule) {
  throw new Error('pragma.conf.ts declares no story for "implementation"');
}

const verbOf = (key: string): VerbSpec =>
  implementationModule.verbs.find((v) => verbKey(v.path) === key) as VerbSpec;

const listVerb = verbOf("implementation list");
const librariesVerb = verbOf("implementation libraries");

const fixtures: FixtureGraph[] = [];
afterAll(async () => {
  await Promise.all(fixtures.map((f) => f.dispose()));
});

/** Boot one tracked canonical fixture, for auto-disposal. */
async function boot(): Promise<FixtureGraph> {
  const fixture = await bootFixtureRuntime({
    ttl: CANONICAL_TTL,
    config: CANONICAL_CONFIG,
  });
  fixtures.push(fixture);
  return fixture;
}

type Row = Record<string, string>;

async function rows(
  verb: VerbSpec,
  params: Record<string, unknown> = {},
): Promise<Row[]> {
  const fixture = await boot();
  const out = await executeVerb(
    verb,
    params,
    NO_MUTATION,
    bootRuntime(JSON_FLAGS, fixture.cwd),
  );
  return JSON.parse(out.stdout as string).data as Row[];
}

/**
 * What the fixture's implementation graph says, as pairs: Button is
 * implemented TWICE, on two platforms, and Modal once.
 */
const EVERY_PAIR = [
  "Button|@canonical/react-ds-global",
  "Button|@canonical/svelte-ds-global",
  "Modal|@canonical/react-ds-global",
];

const pairs = (list: Row[]): string[] =>
  list.map((r) => `${r.block}|${r.library}`).sort();

describe("implementation list — the cross-pack join", () => {
  it("names each block by the design system's ds:name, not by its IRI", async () => {
    // `ds:implementsBlock ds:button` carries no name; `Button` exists only on
    // the block node BLOCK_TTL declares. A row reading `button` here would mean
    // the join silently degraded to the IRI fallback and nobody noticed.
    const list = await rows(listVerb);
    expect(pairs(list)).toEqual(EVERY_PAIR);
    expect(list.map((r) => r.block)).not.toContain("button");
  });

  it("one block implemented twice yields two rows, one per library", async () => {
    // The row is the EDGE, not the block: collapsing the two Button rows into
    // one would answer "is this implemented?" while losing "by whom", which is
    // the question the noun exists for.
    const list = await rows(listVerb);
    expect(list.filter((r) => r.block === "Button")).toHaveLength(2);
  });

  it("carries the source link and the implementation's own IRI", async () => {
    const list = await rows(listVerb);
    const react = list.find(
      (r) => r.block === "Button" && r.platform === "react",
    );
    expect(react?.source).toBe("https://example.test/react/Button.tsx");
    expect(react?.uri).toBe(
      "https://ds.canonical.com/implementation.react-ds-global.button",
    );
  });

  it("falls back to the IRI local name for a block the store does not declare", async () => {
    // The design-system pack can be absent while this one is present — a
    // `sources` config carrying only the implementation graph. The row must
    // stay readable, so the fallback is exercised against an edge whose target
    // is a bare IRI with no `ds:name` anywhere in the store.
    const fixture = await bootFixtureRuntime({
      ttl: `${CANONICAL_TTL}
ds:implementation.library.orphan-lib a ds:ImplementationLibrary ;
  ds:libraryName "@canonical/orphan-lib" ;
  ds:platform "react" ;
  ds:hasImplementation ds:implementation.orphan-lib.unnamed .

ds:implementation.orphan-lib.unnamed a ds:ImplementationObject ;
  ds:implementsBlock ds:global.component.unnamed_block ;
  ds:headLink "https://example.test/orphan/Unnamed.tsx" .
`,
      config: CANONICAL_CONFIG,
    });
    fixtures.push(fixture);
    const out = await executeVerb(
      listVerb,
      {},
      NO_MUTATION,
      bootRuntime(JSON_FLAGS, fixture.cwd),
    );
    const list = JSON.parse(out.stdout as string).data as Row[];
    const orphan = list.find((r) => r.library === "@canonical/orphan-lib");
    expect(orphan?.block).toBe("global.component.unnamed_block");
  });
});

describe("implementation list — the declared filters", () => {
  it("--platform keeps only that platform's rows", async () => {
    expect(pairs(await rows(listVerb, { platform: "svelte" }))).toEqual([
      "Button|@canonical/svelte-ds-global",
    ]);
  });

  it("--library keeps only that library's rows", async () => {
    expect(
      pairs(await rows(listVerb, { library: "@canonical/react-ds-global" })),
    ).toEqual([
      "Button|@canonical/react-ds-global",
      "Modal|@canonical/react-ds-global",
    ]);
  });

  it("--search matches the block name and the library name alike", async () => {
    expect(pairs(await rows(listVerb, { search: "modal" }))).toEqual([
      "Modal|@canonical/react-ds-global",
    ]);
    expect(pairs(await rows(listVerb, { search: "svelte" }))).toEqual([
      "Button|@canonical/svelte-ds-global",
    ]);
  });
});

describe("implementation libraries — the library rows", () => {
  it("lists every library with its platform, tier, version and block count", async () => {
    const list = await rows(librariesVerb);
    expect(list.map((r) => r.name).sort()).toEqual([
      "@canonical/react-ds-global",
      "@canonical/svelte-ds-global",
    ]);
    const react = list.find((r) => r.name === "@canonical/react-ds-global");
    expect(react).toMatchObject({
      platform: "react",
      tier: "global",
      version: "0.34.0",
      count: "2",
    });
  });

  it("the counts agree with the rows `implementation list` returns", async () => {
    // `ds:implementationCount` is asserted by the aggregate INDEX, on the same
    // subject the per-library file describes. The two files can drift apart in
    // the generator, and a count that disagrees with the edges is worse than no
    // count at all — so the two halves are compared rather than each pinned.
    const [libraries, list] = await Promise.all([
      rows(librariesVerb),
      rows(listVerb),
    ]);
    for (const library of libraries) {
      const actual = list.filter((r) => r.library === library.name).length;
      expect(Number(library.count)).toBe(actual);
    }
  });
});
