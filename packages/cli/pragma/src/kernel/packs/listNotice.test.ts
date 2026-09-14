/**
 * A truncated list says so — in EVERY format it is read in.
 *
 * The page notice reached `plain` (stderr) and `json` (`meta.notice`) but never
 * `llm`, which is the form an agent reads and the form ANY piped invocation
 * auto-detects. So `pragma token list --type color` ended at row 300 under a
 * heading that said `(300)`, with nothing anywhere saying a page had been cut.
 *
 * The heading admits it too. The total is NOT named: a page is cut with one
 * extra row rather than a second COUNT over the filtered population, so "more
 * exist" is the strongest claim the read can honestly make.
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

const WIDGET_LIST = {
  query: [
    "SELECT ?uri ?name ?kind WHERE {",
    "  ?uri a ex:Widget ; ex:name ?name .",
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
};

/** Three rows — enough to cut a page in two. */
const WIDGET_PACK: PackDefinition = {
  noun: "widget",
  description: "List widgets.",
  list: WIDGET_LIST,
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

describe("a truncated page says so in every format", () => {
  it("plain: the notice is the last thing the reader is told", async () => {
    const outcome = await executeVerb(
      listVerb(WIDGET_PACK),
      { limit: 2 },
      REAL,
      as(PLAIN),
    );
    expect(outcome.exitCode).toBe(0);
    expect(outcome.stdout).toContain("Button");
    const notice = `${outcome.stdout ?? ""}${outcome.stderr ?? ""}`;
    expect(notice).toContain("Showing 2 widget entries, and more exist.");
    expect(notice).toContain("--after");
  });

  it("llm: the heading admits the page and the body ends with the notice", async () => {
    const outcome = await executeVerb(
      listVerb(WIDGET_PACK),
      { limit: 2 },
      REAL,
      as(LLM),
    );
    const stdout = outcome.stdout ?? "";
    expect(stdout).toContain("## Widget (2, more exist)");
    expect(stdout.trimEnd().split("\n").at(-1)).toContain(
      "Showing 2 widget entries, and more exist.",
    );
  });

  it("json: the notice keeps riding meta", async () => {
    const outcome = await executeVerb(
      listVerb(WIDGET_PACK),
      { limit: 2 },
      REAL,
      as(JSON_FLAGS),
    );
    const envelope = JSON.parse(outcome.stdout as string);
    expect(envelope.meta.notice).toContain("and more exist");
    expect(envelope.data).toHaveLength(2);
  });

  it("a whole answer says nothing extra, in any format", async () => {
    const plain = await executeVerb(listVerb(WIDGET_PACK), {}, REAL, as(PLAIN));
    expect(`${plain.stdout ?? ""}${plain.stderr ?? ""}`).not.toContain(
      "more exist",
    );
    const llm = await executeVerb(listVerb(WIDGET_PACK), {}, REAL, as(LLM));
    expect(llm.stdout).toContain("## Widget (3)");
    expect(llm.stdout).not.toContain("more exist");
  });
});
