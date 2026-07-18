/**
 * Empty-state for pack list verbs (U5, PROTECTED).
 *
 * Listing zero rows is a calm SUCCESS, not an error. The run body returns `[]`
 * (no throw), dispatch renders a non-blank message and exits 0, and JSON stays
 * `[]`. A pack's authored `emptyRecovery` becomes that message's HINT — the v2
 * story still points at `pragma sources update` — but as guidance on the
 * success path, never a thrown EMPTY_RESULTS (which maps to exit 1 and would
 * break the uniform `ok:true` list contract).
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { compilePack } from "../kernel/packs/compile.js";
import type { PackDefinition } from "../kernel/packs/types.js";
import { verbKey } from "../kernel/packs/uniqueness.js";
import { executeVerb } from "../kernel/project/cli/dispatch.js";
import { DEFAULT_PREFIX_MAP } from "../kernel/render/prefixes.js";
import type { PragmaRuntime } from "../kernel/runtime/types.js";
import type { VerbSpec } from "../kernel/spec/types.js";
import { buildFixtureRuntime } from "../testing/helpers/packRuntime.js";
import { modifierPack } from "./modifier/pack.js";
import { standardPack } from "./standard/pack.js";
import { tokenPack } from "./token/pack.js";

const PREFIXES = {
  ds: "https://ds.canonical.com/",
  cs: "https://ds.canonical.com/code-standards/",
  owl: "http://www.w3.org/2002/07/owl#",
  rdfs: "http://www.w3.org/2000/01/rdf-schema#",
  xsd: "http://www.w3.org/2001/XMLSchema#",
};

// The ontology (TBox) with NO individuals — a booted-but-empty store.
const TTL = `
@prefix ds: <https://ds.canonical.com/> .
@prefix cs: <https://ds.canonical.com/code-standards/> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
ds:ModifierFamily a owl:Class .
ds:Modifier a owl:Class .
ds:Token a owl:Class .
ds:TokenType a owl:Class .
cs:CodeStandard a owl:Class .
cs:Category a owl:Class .
ds:name a owl:DatatypeProperty ; rdfs:domain ds:ModifierFamily ; rdfs:range xsd:string .
ds:hasModifier a owl:ObjectProperty ; rdfs:domain ds:ModifierFamily ; rdfs:range ds:Modifier .
ds:modifierFamily a owl:ObjectProperty ; rdfs:domain ds:Modifier ; rdfs:range ds:ModifierFamily .
ds:tokenId a owl:DatatypeProperty ; rdfs:domain ds:Token ; rdfs:range xsd:string .
ds:tokenType a owl:ObjectProperty ; rdfs:domain ds:Token ; rdfs:range ds:TokenType .
cs:description a owl:DatatypeProperty ; rdfs:domain cs:CodeStandard ; rdfs:range xsd:string .
cs:slug a owl:DatatypeProperty ; rdfs:domain cs:Category ; rdfs:range xsd:string .
`;

let rt: PragmaRuntime;
beforeAll(async () => {
  ({ rt } = await buildFixtureRuntime({ ttl: TTL, prefixes: PREFIXES }));
});
afterAll(async () => {
  (await rt.store.get()).store.dispose();
});

const listVerb = (pack: PackDefinition): VerbSpec =>
  compilePack(pack, `bundled:${pack.noun}`, DEFAULT_PREFIX_MAP).find(
    (v) => verbKey(v.path) === `${pack.noun} list`,
  ) as VerbSpec;

/**
 * Every bundled pack list verb, with the hint expected in its empty message:
 * an authored `emptyRecovery` surfaces `pragma sources update`; the others fall
 * back to the generic build/broaden hint.
 */
const PACK_LISTS: readonly { pack: PackDefinition; hint: RegExp }[] = [
  { pack: modifierPack, hint: /pragma sources update/ },
  { pack: tokenPack, hint: /pragma sources update/ },
  { pack: standardPack, hint: /broaden your filter/ },
];

const REAL = { dryRun: false, undo: false, yes: false };

describe("pack list empty-state (U5, PROTECTED)", () => {
  it.each(
    PACK_LISTS,
  )("$pack.noun list on an empty store returns [] — never throws", async ({
    pack,
  }) => {
    await expect(listVerb(pack).run({}, rt)).resolves.toEqual([]);
  });

  it.each(
    PACK_LISTS,
  )("$pack.noun list renders a non-blank message (+ hint) and keeps JSON []", ({
    pack,
    hint,
  }) => {
    const { formatters } = listVerb(pack).output;
    const plain = formatters.plain([]);
    expect(plain).toContain(`No ${pack.noun} entries found.`);
    expect(plain).toMatch(hint);
    // JSON is the uniform empty array — unchanged by the message.
    expect(formatters.json([])).toBe("[]");
    // The llm view stays non-blank too (the `(0)` heading plus the message).
    expect(formatters.llm([]).trim().length).toBeGreaterThan(0);
  });

  it("dispatch prints the empty message on stdout and exits 0 (end-to-end)", async () => {
    const outcome = await executeVerb(listVerb(modifierPack), {}, REAL, rt);
    expect(outcome.exitCode).toBe(0);
    expect(outcome.stdout).toContain("No modifier entries found.");
    expect(outcome.stdout).toContain("pragma sources update");
  });
});
