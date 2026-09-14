/**
 * A zero-row answer names the FILTER, not the store — unless there was no
 * store to name.
 *
 * A story's `emptyRecovery` describes an empty POPULATION ("build the store").
 * Printing it for a search that matched none of 745 present symbols tells the
 * reader the store is empty and prescribes a write that fixes nothing —
 * `token list --search zzzznotreal` said "No token symbols in the store … run
 * `pragma sources update`". So a list narrowed by a search or a declared
 * filter that comes back empty names the filters in force instead.
 *
 * The reverse mistake is just as available, and this file pins both. A filter
 * over a population that is ALREADY empty is the population's question after
 * all: `token consumers --symbol color.text` reads a table holding no bindings
 * at all, and "No token matches `--symbol color.text`" reads there as a
 * mistyped symbol while withholding the only account of the emptiness the verb
 * has. So an empty population keeps its recovery whichever filters are in
 * force, with the filters named in a clause so a reader can see they were
 * applied and are not the cause.
 *
 * Which case it is comes off the page ({@link PackPage.populationEmpty}): the
 * run body asks its own query once more, filters dropped and `LIMIT 1`, only
 * when a filtered read came back empty.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildFixtureRuntime } from "../../testing/helpers/packRuntime.js";
import { executeVerb } from "../project/cli/dispatch.js";
import type { GlobalFlags, PragmaRuntime } from "../runtime/types.js";
import type { VerbSpec } from "../spec/types.js";
import { compilePack } from "./compile.js";
import type { PackDefinition, PackPage } from "./types.js";
import { distributionSource } from "./types.js";
import { verbKey } from "./uniqueness.js";

const PREFIXES = {
  ex: "https://example.org/widgets#",
  owl: "http://www.w3.org/2002/07/owl#",
  rdfs: "http://www.w3.org/2000/01/rdf-schema#",
  xsd: "http://www.w3.org/2001/XMLSchema#",
};

const TTL = `
@prefix ex: <https://example.org/widgets#> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

ex:Widget a owl:Class .
ex:Gadget a owl:Class .
ex:name a owl:DatatypeProperty ; rdfs:domain ex:Widget ; rdfs:range xsd:string .
ex:kind a owl:DatatypeProperty ; rdfs:domain ex:Widget ; rdfs:range xsd:string .

ex:button a ex:Widget ; ex:name "Button" ; ex:kind "input" .
ex:label  a ex:Widget ; ex:name "Label"  ; ex:kind "display" .
ex:slider a ex:Widget ; ex:name "Slider" ; ex:kind "input" .
`;

/** The recovery a story authors for an EMPTY POPULATION — never for a filter. */
const EMPTY_RECOVERY = {
  message: "No widgets in the store.",
  cli: "sources update",
} as const;

const listShape = (uriClass: string) => ({
  query: [
    "SELECT ?uri ?name ?kind WHERE {",
    `  ?uri a ${uriClass} ; ex:name ?name .`,
    "  OPTIONAL { ?uri ex:kind ?kind }",
    "} ORDER BY ?name",
  ].join("\n"),
  columns: [
    { field: "uri", label: "IRI" },
    { field: "name", label: "Name" },
    { field: "kind", label: "Kind" },
  ],
  filters: [{ param: "kind", variable: "kind", values: ["input", "display"] }],
  search: { variables: ["name"] },
  emptyRecovery: EMPTY_RECOVERY,
});

/** Three rows — enough to cut a page in two. */
const WIDGET_PACK: PackDefinition = {
  noun: "widget",
  description: "List widgets.",
  list: listShape("ex:Widget"),
};

/** A declared class with no individuals — the genuinely empty population. */
const GADGET_PACK: PackDefinition = {
  noun: "gadget",
  description: "List gadgets.",
  list: { ...listShape("ex:Gadget"), emptyRecovery: EMPTY_RECOVERY },
};

/** The same empty population, by a story that authors no recovery of its own. */
const SPROCKET_PACK: PackDefinition = (() => {
  const { emptyRecovery: _none, ...list } = listShape("ex:Gadget");
  return { noun: "sprocket", description: "List sprockets.", list };
})();

const listVerb = (pack: PackDefinition): VerbSpec =>
  compilePack(pack, distributionSource("test:list"), PREFIXES).find(
    (v) => verbKey(v.path) === `${pack.noun} list`,
  ) as VerbSpec;

const REAL = { dryRun: false, undo: false, yes: false };

const PLAIN: GlobalFlags = {
  llm: false,
  autoLlm: false,
  format: "plain",
  verbose: false,
};
const LLM: GlobalFlags = { ...PLAIN, llm: true, format: "llm" };
const JSON_FLAGS: GlobalFlags = { ...PLAIN, format: "json" };

let rt: PragmaRuntime;
/** The same runtime, reading in another format. */
const as = (flags: GlobalFlags): PragmaRuntime => ({
  ...rt,
  globalFlags: flags,
});

beforeAll(async () => {
  ({ rt } = await buildFixtureRuntime({ ttl: TTL, prefixes: PREFIXES }));
});
afterAll(async () => {
  (await rt.store.get()).store.dispose();
});

describe("a zero-row answer names the filter, not the store", () => {
  it("a search that matched nothing does not prescribe a write", async () => {
    const outcome = await executeVerb(
      listVerb(WIDGET_PACK),
      { search: "zzzznotreal" },
      REAL,
      as(PLAIN),
    );
    expect(outcome.exitCode).toBe(0);
    const said = `${outcome.stdout ?? ""}${outcome.stderr ?? ""}`;
    expect(said).toContain("No widget matches `--search zzzznotreal`.");
    expect(said).not.toContain("No widgets in the store.");
    expect(said).not.toContain("sources update");
  });

  it("every filter in force is named", async () => {
    const outcome = await executeVerb(
      listVerb(WIDGET_PACK),
      { kind: "display", search: "zzzznotreal" },
      REAL,
      as(PLAIN),
    );
    const said = `${outcome.stdout ?? ""}${outcome.stderr ?? ""}`;
    expect(said).toContain(
      "No widget matches `--kind display` and `--search zzzznotreal`.",
    );
  });

  it("the llm body says the same thing", async () => {
    const outcome = await executeVerb(
      listVerb(WIDGET_PACK),
      { search: "zzzznotreal" },
      REAL,
      as(LLM),
    );
    expect(outcome.stdout).toContain(
      "No widget matches `--search zzzznotreal`.",
    );
    expect(outcome.stdout).not.toContain("sources update");
  });

  it("json says the same thing on meta.notice", async () => {
    const outcome = await executeVerb(
      listVerb(WIDGET_PACK),
      { search: "zzzznotreal" },
      REAL,
      as(JSON_FLAGS),
    );
    const envelope = JSON.parse(outcome.stdout as string);
    expect(envelope.data).toEqual([]);
    expect(envelope.meta.notice).toContain(
      "No widget matches `--search zzzznotreal`.",
    );
    expect(envelope.meta.notice).not.toContain("sources update");
  });

  it("an EMPTY POPULATION still gets the story's own recovery", async () => {
    const outcome = await executeVerb(
      listVerb(GADGET_PACK),
      {},
      REAL,
      as(PLAIN),
    );
    expect(outcome.exitCode).toBe(0);
    expect(outcome.stderr).toContain("No gadget entries found.");
    expect(outcome.stderr).toContain("No widgets in the store.");
    expect(outcome.stderr).toContain("pragma sources update");
  });

  it("a page that has rows never pays for the population probe", async () => {
    const page = (await listVerb(WIDGET_PACK).run(
      { kind: "input" },
      rt,
    )) as PackPage;
    expect(page.rows).toHaveLength(2);
    expect(page.populationEmpty).toBeUndefined();
  });

  it("a filtered miss records a population that is NOT empty", async () => {
    const page = (await listVerb(WIDGET_PACK).run(
      { search: "zzzznotreal" },
      rt,
    )) as PackPage;
    expect(page.rows).toEqual([]);
    expect(page.populationEmpty).toBe(false);
  });
});

describe("a filter over an empty population still explains the emptiness", () => {
  it("keeps the story's recovery and names the filter in a clause", async () => {
    const outcome = await executeVerb(
      listVerb(GADGET_PACK),
      { kind: "input" },
      REAL,
      as(PLAIN),
    );
    expect(outcome.exitCode).toBe(0);
    const said = `${outcome.stdout ?? ""}${outcome.stderr ?? ""}`;
    // The filters are reported — a message that never mentions the argument a
    // reader typed leaves them wondering whether it was read at all …
    expect(said).toContain(
      "No gadget entries found (with `--kind input` applied).",
    );
    // … and reported as a CLAUSE, not as the answer: the story's account of the
    // empty population is the answer, and it survives the filter intact.
    expect(said).toContain("No widgets in the store.");
    expect(said).toContain("pragma sources update");
    expect(said).not.toContain("No gadget matches");
  });

  it("names every filter in force", async () => {
    const outcome = await executeVerb(
      listVerb(GADGET_PACK),
      { kind: "display", search: "anything" },
      REAL,
      as(PLAIN),
    );
    const said = `${outcome.stdout ?? ""}${outcome.stderr ?? ""}`;
    expect(said).toContain(
      "No gadget entries found (with `--kind display` and `--search anything` applied).",
    );
    expect(said).toContain("No widgets in the store.");
  });

  it("the llm body and json meta.notice carry both facts", async () => {
    const llm = await executeVerb(
      listVerb(GADGET_PACK),
      { kind: "input" },
      REAL,
      as(LLM),
    );
    expect(llm.stdout).toContain(
      "No gadget entries found (with `--kind input` applied).",
    );
    expect(llm.stdout).toContain("No widgets in the store.");

    const json = await executeVerb(
      listVerb(GADGET_PACK),
      { kind: "input" },
      REAL,
      as(JSON_FLAGS),
    );
    const envelope = JSON.parse(json.stdout as string);
    expect(envelope.data).toEqual([]);
    expect(envelope.meta.notice).toContain(
      "No gadget entries found (with `--kind input` applied).",
    );
    expect(envelope.meta.notice).toContain("No widgets in the store.");
  });

  it("records the empty population on the page, once, for every renderer", async () => {
    const page = (await listVerb(GADGET_PACK).run(
      { kind: "input" },
      rt,
    )) as PackPage;
    expect(page.rows).toEqual([]);
    expect(page.populationEmpty).toBe(true);
    expect(page.filters).toEqual([{ param: "kind", value: "input" }]);
  });

  it("falls back to the generic empty hint when the story declares no recovery", async () => {
    // A story with no `emptyRecovery` has no account of its own to keep, so the
    // generic one — which offers BOTH a wider filter and a build — is what the
    // filters clause hangs off. Dropping it and reporting only the filter would
    // lose the build half on a store that really is empty.
    const outcome = await executeVerb(
      listVerb(SPROCKET_PACK),
      { kind: "input" },
      REAL,
      as(PLAIN),
    );
    const said = `${outcome.stdout ?? ""}${outcome.stderr ?? ""}`;
    expect(said).toContain(
      "No sprocket entries found (with `--kind input` applied).",
    );
    expect(said).toContain("pragma sources update");
  });
});
