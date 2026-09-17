/**
 * A zero-row answer names the FILTER and still explains the POPULATION.
 *
 * Two facts can empty a list and the rows cannot tell them apart: nothing was
 * there, or a filter missed what was. So the page says both — the kernel's
 * sentence names the filters in force (`token list --search zzzznotreal` used
 * to answer "No token symbols in the store … run `pragma sources update`",
 * telling a reader with 745 present symbols to rebuild for nothing), and the
 * story's own `emptyRecovery` follows it, exactly as it does when nothing
 * narrowed the read.
 *
 * Which puts one requirement on the stories rather than on the kernel: a
 * recovery is worded to hold in BOTH cases, or the story declares none. The
 * fixture below is worded that way on purpose.
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

/**
 * The recovery a story authors — where the rows come from, said so it holds
 * over a populated table a filter missed as well as over an empty one.
 *
 * "No widgets in the store." would not: it is a claim about the population, and
 * the kernel prints this under a filtered miss too, where three widgets are
 * sitting in the store.
 */
const EMPTY_RECOVERY = {
  message:
    "Widgets are recorded by the catalogue build, and a store built before it ran records none.",
  call: { verb: "sources update" },
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

/** Three rows — a POPULATED table, so a filter that misses really is the news. */
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

describe("a zero-row answer names the filter and keeps the recovery", () => {
  it("a search that matched nothing names the search, and still explains", async () => {
    const outcome = await executeVerb(
      listVerb(WIDGET_PACK),
      { search: "zzzznotreal" },
      REAL,
      as(PLAIN),
    );
    expect(outcome.exitCode).toBe(0);
    const said = `${outcome.stdout ?? ""}${outcome.stderr ?? ""}`;
    expect(said).toContain("No widget matches `--search zzzznotreal`.");
    // The filter is the news; the story's account of where widgets come from is
    // the other half, and a reader who mistyped nothing needs it.
    expect(said).toContain("recorded by the catalogue build");
    expect(said).toContain("pragma sources update");
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
    expect(outcome.stdout).toContain("recorded by the catalogue build");
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
    expect(envelope.meta.notice).toContain("recorded by the catalogue build");
  });

  it("an EMPTY POPULATION under a filter keeps the story's own recovery", async () => {
    // The regression: `token consumers --symbol color.text` narrows a table
    // that records nothing at all, and answering only "no match for that
    // symbol" read as a typo while withholding the one account the verb has.
    // No probe tells the two apart — the sentence does, by saying both.
    const outcome = await executeVerb(
      listVerb(GADGET_PACK),
      { kind: "input" },
      REAL,
      as(PLAIN),
    );
    expect(outcome.exitCode).toBe(0);
    const said = `${outcome.stderr ?? ""}`;
    expect(said).toContain("No gadget matches `--kind input`.");
    expect(said).toContain("recorded by the catalogue build");
    expect(said).toContain("pragma sources update");
  });

  it("an EMPTY POPULATION unfiltered gets the kernel's own sentence", async () => {
    const outcome = await executeVerb(
      listVerb(GADGET_PACK),
      {},
      REAL,
      as(PLAIN),
    );
    expect(outcome.exitCode).toBe(0);
    expect(outcome.stderr).toContain("No gadget entries found.");
    expect(outcome.stderr).toContain("recorded by the catalogue build");
    expect(outcome.stderr).toContain("pragma sources update");
  });
});
