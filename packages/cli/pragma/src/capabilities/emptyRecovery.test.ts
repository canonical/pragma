/**
 * Empty-state for pack list verbs (U5, PROTECTED).
 *
 * Listing zero rows is a calm SUCCESS, not an error. The run body returns `[]`
 * (no throw), dispatch renders a non-blank message and exits 0, and JSON stays
 * `[]`. A story's declared `emptyRecovery` becomes that message's HINT — but as
 * guidance on the success path, never a thrown EMPTY_RESULTS (which maps to
 * exit 1 and would break the uniform `ok:true` list contract).
 *
 * The story declares the command WITHOUT a binary name (`sources update`); the
 * renderer prepends the CONSUMING distribution's. The hints asserted below are
 * therefore the JOINED string, which is what a user reads — a story that named
 * a binary itself would render it twice, and the grammar now refuses one.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { compilePack } from "../kernel/packs/compile.js";
import type { PackDefinition } from "../kernel/packs/types.js";
import { distributionSource } from "../kernel/packs/types.js";
import { verbKey } from "../kernel/packs/uniqueness.js";
import { executeVerb } from "../kernel/project/cli/dispatch.js";
import { DEFAULT_PREFIX_MAP } from "../kernel/render/prefixes.js";
import type { PragmaRuntime } from "../kernel/runtime/types.js";
import type { VerbSpec } from "../kernel/spec/types.js";
import { buildFixtureRuntime } from "../testing/helpers/packRuntime.js";
import { declaredStories } from "./distribution.js";

/** A story `pragma.conf.ts` declares — absent means it was renamed or dropped. */
function storyFor(noun: string): PackDefinition {
  const story = declaredStories.get(noun);
  if (!story) throw new Error(`pragma.conf.ts declares no story for "${noun}"`);
  return story;
}

const PREFIXES = {
  ds: "https://ds.canonical.com/",
  cs: "https://ds.canonical.com/code-standards/",
  // The `standard` list query names `skos:broader` for its category roll-up —
  // a CORE prefix on the real build path, which this in-memory helper bypasses.
  skos: "http://www.w3.org/2004/02/skos/core#",
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
  compilePack(
    pack,
    distributionSource("pragma.conf.ts"),
    DEFAULT_PREFIX_MAP,
  ).find((v) => verbKey(v.path) === `${pack.noun} list`) as VerbSpec;

/**
 * Every declared story's list verb, with the hint expected in its empty message:
 * an authored `emptyRecovery` surfaces `pragma sources update`; the others fall
 * back to the generic build/broaden hint.
 */
const PACK_LISTS: readonly { pack: PackDefinition; hint: RegExp }[] = [
  { pack: storyFor("modifier"), hint: /pragma sources update/ },
  { pack: storyFor("token"), hint: /pragma sources update/ },
  // CHANGED DELIBERATELY. `standard` used to fall through to the generic
  // build/broaden hint, and the build half of it is actively WRONG for this
  // noun: the code standards ride the embedded snapshot and answer with no
  // `sources update` at all. It now authors its own, pointing at the one
  // surface that reads the category vocabulary out of the graph.
  { pack: storyFor("standard"), hint: /pragma standard categories/ },
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
  )("$pack.noun list declares a non-blank empty notice (+ hint), JSON stays []", ({
    pack,
    hint,
  }) => {
    const { formatters } = listVerb(pack).output;
    // The message + runnable hint live on the empty-state seam — the
    // dispatcher routes them to stderr, keeping plain stdout pure data.
    const notice = formatters.notice?.([]);
    expect(notice).toContain(`No ${pack.noun} entries found.`);
    expect(notice).toMatch(hint);
    // JSON is the uniform empty array — unchanged by the message.
    expect(formatters.json([])).toBe("[]");
    // The llm view stays non-blank too (the `(0)` heading plus the message).
    expect(formatters.llm([]).trim().length).toBeGreaterThan(0);
  });

  it("dispatch routes the empty message to stderr and exits 0 (end-to-end)", async () => {
    const outcome = await executeVerb(
      listVerb(storyFor("modifier")),
      {},
      REAL,
      rt,
    );
    expect(outcome.exitCode).toBe(0);
    // stdout carries no prose a pipe would read as a record; the calm notice
    // and its hint reach the human on stderr.
    expect(outcome.stdout ?? "").not.toContain("No modifier entries found.");
    expect(outcome.stderr).toContain("No modifier entries found.");
    expect(outcome.stderr).toContain("pragma sources update");
  });
});
