/**
 * Tier-noun semantic parity (PROTECTED) — the `tier` story `pragma.conf.ts`
 * declares, over a tier/block fixture graph (the standard-noun pattern).
 *
 * The hand-written `tier lookup` is gone (L-OPEN-9): both verbs compile from
 * the declared story, so parity is asserted directly against the graph — every
 * tier is reachable through list/lookup with the same names, addressable by
 * name AND by prefixed IRI (the candidates completion now offers, D9-A), the
 * `blocks` expand resolves the INVERSE path `^ds:tier` (the members scoped
 * directly to the tier), a memberless tier still resolves, and a miss carries
 * "did you mean?" suggestions like every declared lookup.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { compilePack } from "../kernel/packs/compile.js";
import type { LookupOutput } from "../kernel/packs/resolveEntity.js";
import type { PackRow } from "../kernel/packs/types.js";
import { verbKey } from "../kernel/packs/uniqueness.js";
import { DEFAULT_PREFIX_MAP } from "../kernel/render/prefixes.js";
import type { PragmaRuntime } from "../kernel/runtime/types.js";
import type { VerbSpec } from "../kernel/spec/types.js";
import { buildFixtureRuntime } from "../testing/helpers/packRuntime.js";
import { declaredStories } from "./distribution.js";

const tierPack = declaredStories.get("tier");
if (!tierPack) {
  throw new Error('pragma.conf.ts declares no story for "tier"');
}

const DS = "https://ds.canonical.com/";
const PREFIXES = {
  ds: DS,
  owl: "http://www.w3.org/2002/07/owl#",
  rdfs: "http://www.w3.org/2000/01/rdf-schema#",
  xsd: "http://www.w3.org/2001/XMLSchema#",
};

const TTL = `
@prefix ds: <${DS}> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

ds:Tier a owl:Class .
ds:Component a owl:Class .
ds:name a owl:DatatypeProperty ; rdfs:range xsd:string .
ds:tier a owl:ObjectProperty ; rdfs:range ds:Tier .

ds:global a ds:Tier ; ds:name "global" .
ds:apps a ds:Tier ; ds:name "apps" .
ds:apps_lxd a ds:Tier ; ds:name "apps/lxd" .

ds:button a ds:Component ; ds:name "Button" ; ds:tier ds:global .
ds:modal a ds:Component ; ds:name "Modal" ; ds:tier ds:global .
ds:lxdPanel a ds:Component ; ds:name "LXD Panel" ; ds:tier ds:apps_lxd .
`;

const verbs = () => compilePack(tierPack, "pragma.conf.ts", DEFAULT_PREFIX_MAP);
const verb = (label: string) =>
  verbs().find((v) => verbKey(v.path) === `tier ${label}`) as VerbSpec;

let rt: PragmaRuntime;
beforeAll(async () => {
  ({ rt } = await buildFixtureRuntime({ ttl: TTL, prefixes: PREFIXES }));
});
afterAll(async () => {
  (await rt.store.get()).store.dispose();
});

async function lookup(name: string): Promise<Record<string, unknown>> {
  const out = (await verb("lookup").run({ name: [name] }, rt)) as LookupOutput;
  expect(out.errors).toEqual([]);
  return out.results.at(0) as Record<string, unknown>;
}

/** The `blocks` expand's child names, sorted (the sub-SELECT is unordered). */
function blockNames(entity: Record<string, unknown>): string[] {
  return (entity.blocks as { name: string }[]).map((b) => b.name).sort();
}

describe("tier list parity", () => {
  it("lists every tier, name-ordered, with the uniform row shape", async () => {
    const rows = (await verb("list").run({}, rt)) as PackRow[];
    expect(rows.map((r) => r.name)).toEqual(["apps", "apps/lxd", "global"]);
    for (const row of rows) {
      expect(row.uri).toBeTruthy();
    }
  });
});

describe("tier lookup parity — the declared story's compiled lookup", () => {
  it("resolves a tier by name and expands the blocks scoped directly to it", async () => {
    const tier = await lookup("apps/lxd");
    expect(tier.uri).toBe(`${DS}apps_lxd`);
    expect(tier.name).toBe("apps/lxd");
    // The `blocks` expand walks the INVERSE `^ds:tier` path (contract:
    // `PackExpand.relation` admits property paths), so only the DIRECT
    // members appear — no chain inheritance.
    expect(blockNames(tier)).toEqual(["LXD Panel"]);
    const global = await lookup("global");
    expect(blockNames(global)).toEqual(["Button", "Modal"]);
  });

  it("a memberless tier still resolves, with an empty blocks expand", async () => {
    const apps = await lookup("apps");
    expect(apps.name).toBe("apps");
    expect(apps.blocks).toEqual([]);
    // The empty expand renders as an OMITTED section (the generic renderers'
    // behavior for every declared noun), not a placeholder line.
    const out = (await verb("lookup").run({ name: ["apps"] }, rt)) as never;
    expect(verb("lookup").output.formatters.llm(out)).not.toContain("Blocks");
  });

  it("resolves the same tier by prefixed IRI — the candidates completion offers (D9-A)", async () => {
    // Completion for the declared lookup serves index entity NAMES (prefixed
    // IRIs); a candidate is only honest if the lookup resolves it.
    const byIri = await lookup("ds:apps_lxd");
    expect(byIri.name).toBe("apps/lxd");
    expect(byIri.uri).toBe(`${DS}apps_lxd`);
  });

  it("resolves a variadic batch in one call", async () => {
    const out = (await verb("lookup").run(
      { name: ["global", "apps"] },
      rt,
    )) as LookupOutput;
    expect(out.results.map((r) => r.name)).toEqual(["global", "apps"]);
  });

  it("a miss fails ENTITY_NOT_FOUND with a near-miss suggestion (B6 parity kept)", async () => {
    // The bespoke lookup earned "did you mean?" in B6; the declared path keeps
    // it — suggestions come from the same name list every declared lookup uses.
    let caught: unknown;
    try {
      await verb("lookup").run({ name: ["apps/lxdd"] }, rt);
    } catch (error) {
      caught = error;
    }
    expect(caught).toMatchObject({ code: "ENTITY_NOT_FOUND" });
    expect((caught as { suggestions: string[] }).suggestions).toContain(
      "apps/lxd",
    );
  });
});
