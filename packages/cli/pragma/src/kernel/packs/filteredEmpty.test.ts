/**
 * A zero-row answer names the FILTER, not the store.
 *
 * A story's `emptyRecovery` describes an empty POPULATION ("build the store").
 * Printing it for a search that matched none of 745 present symbols tells the
 * reader the store is empty and prescribes a write that fixes nothing —
 * `token list --search zzzznotreal` said "No token symbols in the store … run
 * `pragma sources update`". So a list narrowed by a search or a declared
 * filter that comes back empty names the filters in force instead, and the
 * story's own recovery stays for the case it was written for.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildFixtureRuntime } from "../../testing/helpers/packRuntime.js";
import { executeVerb } from "../project/cli/dispatch.js";
import type { GlobalFlags, PragmaRuntime } from "../runtime/types.js";
import type { VerbSpec } from "../spec/types.js";
import { compilePack } from "./compile.js";
import type { PackDefinition } from "./types.js";
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
});
