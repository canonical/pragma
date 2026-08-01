/**
 * Block-noun semantic parity (PROTECTED) — the `block` story `pragma.conf.ts`
 * declares, over the shared block fixture graph (the standard-noun pattern).
 *
 * The `block` noun has no hand-written code left (L-OPEN-9): `list` and
 * `lookup` both compile from the declared story, so parity is asserted directly
 * against the graph. Two halves:
 *
 * - `block list` — the UNFILTERED list. Every block in the store, whatever the
 *   tier or channel, including the UNTIERED subcomponent the old hand-written
 *   query's required `ds:tier` join dropped (A2, formerly reachable only under
 *   `--all-tiers`). The row shape the hand-written verb built in TypeScript —
 *   the name fallback, the lowercased type, the tier's local name — is now
 *   derived IN SPARQL by `BIND`/`COALESCE`, and this file is what holds those
 *   BINDs to the shapes the old `blockList.verb.ts` produced.
 * - `block lookup` — unchanged GraphQL content parity, moved here from the
 *   deleted `capabilities/block/parity.test.ts`. Button and Modal resolve with
 *   the same content a direct SPARQL oracle returns (summary, guidance,
 *   anatomy, tier, modifier families with values, properties, subcomponents).
 *   The fixture DECLARES whenToUse/whenNotToUse (which the live graph superseded
 *   with ds:usage), so those sections are exercised here.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { LookupOutput } from "../kernel/packs/resolveEntity.js";
import type { PackRow } from "../kernel/packs/types.js";
import { verbKey } from "../kernel/packs/uniqueness.js";
import type { PragmaRuntime } from "../kernel/runtime/types.js";
import type { VerbSpec } from "../kernel/spec/types.js";
import { BLOCK_PREFIXES, BLOCK_TTL } from "../testing/fixtures/blockGraph.js";
import { buildFixtureRuntime } from "../testing/helpers/packRuntime.js";
import { storyModules } from "./distribution.js";

const blockModule = storyModules.get("block");
if (!blockModule) {
  throw new Error('pragma.conf.ts declares no story for "block"');
}

const DS = "https://ds.canonical.com/";

const verb = (label: string): VerbSpec =>
  blockModule.verbs.find(
    (v) => verbKey(v.path) === `block ${label}`,
  ) as VerbSpec;

let rt: PragmaRuntime;

beforeAll(async () => {
  ({ rt } = await buildFixtureRuntime({
    ttl: BLOCK_TTL,
    prefixes: BLOCK_PREFIXES,
    detail: "detailed",
  }));
});

afterAll(async () => {
  (await rt.store.get()).store.dispose();
});

async function lookup(name: string): Promise<Record<string, unknown>> {
  const out = (await verb("lookup").run({ name: [name] }, rt)) as LookupOutput;
  expect(out.errors).toEqual([]);
  return out.results.at(0) as Record<string, unknown>;
}

describe("block list parity — the declared, unfiltered list", () => {
  it("lists EVERY block, including the untiered subcomponent (A2)", async () => {
    // `ds:button.icon` is a `ds:Subcomponent` with NO `ds:tier`. The
    // hand-written query inner-joined `?c ds:tier ?t` in its default view and
    // surfaced it only under `--all-tiers`; the declared query's OPTIONAL join
    // means there is no view it can fall out of.
    const rows = (await verb("list").run({}, rt)) as PackRow[];
    expect(rows.map((row) => row.name)).toEqual([
      "Button",
      "Button Icon",
      "Modal",
    ]);
  });

  it("derives the summary row shape in SPARQL, matching the old hand-built row", async () => {
    const rows = (await verb("list").run({}, rt)) as PackRow[];
    const byName = new Map(rows.map((row) => [row.name, row]));
    const button = byName.get("Button");
    // `type`: the LOWERCASED local name of the matched class — the BIND that
    // replaced `normalizeType`.
    expect(button?.type).toBe("component");
    expect(byName.get("Button Icon")?.type).toBe("subcomponent");
    // `tier`: the tier IRI's local name — the BIND that replaced `localName`.
    expect(button?.tier).toBe("global");
    expect(button?.uri).toBe(`${DS}button`);
    // GROUP_CONCAT of the family names (order-independent).
    expect(String(button?.modifiers).split(", ").sort()).toEqual([
      "density",
      "importance",
    ]);
  });

  it("an untiered block simply carries no tier — it is not dropped or blanked", async () => {
    const rows = (await verb("list").run({}, rt)) as PackRow[];
    const icon = rows.find((row) => row.name === "Button Icon");
    expect(icon).toBeDefined();
    expect(icon?.tier).toBeUndefined();
    expect(icon?.uri).toBe(`${DS}button.icon`);
  });

  it("is CONFIG-INDEPENDENT: a configured tier and channel change nothing", async () => {
    // The signed-off consequence of L-OPEN-9, pinned at the verb: the run body
    // never reads `loadConfig()`, so the same rows come back under any scope.
    const scoped = {
      ...rt,
      loadConfig: async () => ({
        ...(await rt.loadConfig()),
        config: {
          ...(await rt.loadConfig()).config,
          tier: "apps/lxd",
          channel: "experimental" as const,
        },
      }),
    } as PragmaRuntime;
    const scopedRows = (await verb("list").run({}, scoped)) as PackRow[];
    const plainRows = (await verb("list").run({}, rt)) as PackRow[];
    expect(scopedRows).toEqual(plainRows);
  });

  it("zero rows is a calm empty list, not an error (the declared-family semantics)", async () => {
    // D10-A, measured: `makeListRun` returns `[]` and never throws on
    // emptiness — identical exit-code behaviour to the hand-written verb, which
    // also returned an empty array. Only the empty MESSAGE changed (the pack's
    // `emptyRecovery` replaces the `--all-tiers` hint that no longer exists).
    const { rt: emptyRt } = await buildFixtureRuntime({
      ttl: `
@prefix ds: <${DS}> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
ds:Component a owl:Class .
`,
      prefixes: BLOCK_PREFIXES,
    });
    try {
      const rows = (await verb("list").run({}, emptyRt)) as PackRow[];
      expect(rows).toEqual([]);
      const plain = verb("list").output.formatters.plain(rows);
      expect(plain).toContain("No blocks in the store.");
      expect(plain).toContain("pragma sources update");
    } finally {
      (await emptyRt.store.get()).store.dispose();
    }
  });
});

describe("block lookup — Button content parity (GraphQL, detailed)", () => {
  it("resolves the full Button spec with content matching the SPARQL oracle", async () => {
    const button = await lookup("Button");
    expect(button.uri).toBe(`${DS}button`);
    expect(button.name).toBe("Button");
    expect(button.tier).toBe(`${DS}global`);

    // Guidance + anatomy sections — each cross-checked against the graph.
    expect(button.summary).toBe(await oracle(`${DS}button`, "ds:summary"));
    expect(button.whenToUse).toBe(await oracle(`${DS}button`, "ds:whenToUse"));
    expect(button.whenNotToUse).toBe(
      await oracle(`${DS}button`, "ds:whenNotToUse"),
    );
    expect(button.guidelines).toBe(
      await oracle(`${DS}button`, "ds:guidelines"),
    );
    expect(button.anatomyDsl).toBe(
      await oracle(`${DS}button`, "ds:anatomyDsl"),
    );
    expect(button.figmaLink).toBe(await oracle(`${DS}button`, "ds:figmaLink"));
  });

  it("resolves the nested modifier families with values (inverse union)", async () => {
    const button = await lookup("Button");
    const families = button.modifierFamilies as {
      name: string;
      values?: string[];
    }[];
    expect(families.map((f) => f.name).sort()).toEqual([
      "density",
      "importance",
    ]);
    const importance = families.find((f) => f.name === "importance");
    expect(importance?.values?.sort()).toEqual(["primary", "secondary"]);
  });

  it("resolves properties and the subtype-scoped subcomponents identity field", async () => {
    const button = await lookup("Button");
    expect(button.properties).toEqual([
      { name: "disabled", type: "boolean", optional: "true" },
    ]);
    expect(button.subcomponents).toEqual([
      { name: "Button Icon", uri: `${DS}button.icon` },
    ]);
  });

  it("renders every declared section in the llm output", async () => {
    const out = (await verb("lookup").run({ name: ["Button"] }, rt)) as never;
    const llm = verb("lookup").output.formatters.llm(out);
    expect(llm).toContain("## Button");
    expect(llm).toContain("### When to use");
    expect(llm).toContain("### Anatomy (DSL)");
    expect(llm).toContain("### Modifier Families");
    expect(llm).toContain("primary");
  });
});

describe("block lookup — Modal content parity (GraphQL, detailed)", () => {
  it("resolves the full Modal spec (a different block, same document engine)", async () => {
    const modal = await lookup("Modal");
    expect(modal.uri).toBe(`${DS}modal`);
    expect(modal.name).toBe("Modal");
    expect(modal.summary).toBe(await oracle(`${DS}modal`, "ds:summary"));
    expect(modal.whenToUse).toBe(await oracle(`${DS}modal`, "ds:whenToUse"));
    const families = modal.modifierFamilies as {
      name: string;
      values?: string[];
    }[];
    expect(families.map((f) => f.name)).toEqual(["size"]);
    expect(families[0]?.values?.sort()).toEqual(["large", "small"]);
    expect(modal.properties).toEqual([
      { name: "open", type: "boolean", optional: "false" },
    ]);
    // Modal has no subcomponents — the subtype-scoped selection is simply absent.
    expect(modal.subcomponents).toEqual([]);
  });
});

describe("block lookup — disclosure trims to the base view at summary", () => {
  it("summary keeps name/tier/summary and drops the detailed sections/expands", async () => {
    const out = (await verb("lookup").run(
      { name: ["Button"] },
      { ...rt, globalFlags: { ...rt.globalFlags, detail: "summary" } },
    )) as LookupOutput;
    const button = out.results.at(0) as Record<string, unknown>;
    expect(button.name).toBe("Button");
    expect(button.summary).toBeDefined();
    expect(button.whenToUse).toBeUndefined();
    expect(button.anatomyDsl).toBeUndefined();
    expect(button.modifierFamilies).toBeUndefined();
    expect(button.figmaLink).toBeUndefined();
  });
});

/** Oracle: a single scalar from the graph, queried directly. */
async function oracle(subject: string, predicate: string): Promise<string> {
  const result = await rt.query.sparql(
    `SELECT ?v WHERE { <${subject}> ${predicate} ?v }`,
  );
  return result.type === "select" ? (result.bindings[0]?.v ?? "") : "";
}
