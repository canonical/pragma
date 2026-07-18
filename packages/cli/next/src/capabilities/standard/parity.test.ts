/**
 * Standard-noun semantic parity (PROTECTED) — the bundled `standard` pack over a
 * code-standards fixture graph.
 *
 * The hand-written standard domain is gone, so parity is asserted directly
 * against the graph: every standard is reachable through list/lookup/categories/
 * sample with the same names and values, addressable by name, prefixed name, and
 * IRI, with the canonical disclosure levels (summary → base, `standard` → dos,
 * `detailed` → dos + donts). `cs:extends` stays the raw IRI in data.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { compilePack } from "../../kernel/packs/compile.js";
import type { LookupOutput } from "../../kernel/packs/resolveEntity.js";
import { parsePackDefinition } from "../../kernel/packs/schema.js";
import type { PackRow } from "../../kernel/packs/types.js";
import { verbKey } from "../../kernel/packs/uniqueness.js";
import { DEFAULT_PREFIX_MAP } from "../../kernel/render/prefixes.js";
import type { PragmaRuntime } from "../../kernel/runtime/types.js";
import type { VerbSpec } from "../../kernel/spec/types.js";
import { buildFixtureRuntime } from "../../testing/helpers/packRuntime.js";
import { standardPack } from "./pack.js";

const CS = "http://pragma.canonical.com/codestandards#";
const PREFIXES = {
  cs: CS,
  owl: "http://www.w3.org/2002/07/owl#",
  rdfs: "http://www.w3.org/2000/01/rdf-schema#",
  xsd: "http://www.w3.org/2001/XMLSchema#",
};

const TTL = `
@prefix cs: <${CS}> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

cs:CodeStandard a owl:Class .
cs:Category a owl:Class .
cs:Example a owl:Class .
cs:name a owl:DatatypeProperty ; rdfs:domain cs:CodeStandard ; rdfs:range xsd:string .
cs:description a owl:DatatypeProperty ; rdfs:range xsd:string .
cs:hasCategory a owl:ObjectProperty ; rdfs:domain cs:CodeStandard ; rdfs:range cs:Category .
cs:slug a owl:DatatypeProperty ; rdfs:domain cs:Category ; rdfs:range xsd:string .
cs:extends a owl:ObjectProperty ; rdfs:domain cs:CodeStandard ; rdfs:range cs:CodeStandard .
cs:do a owl:ObjectProperty ; rdfs:domain cs:CodeStandard ; rdfs:range cs:Example .
cs:dont a owl:ObjectProperty ; rdfs:domain cs:CodeStandard ; rdfs:range cs:Example .
cs:language a owl:DatatypeProperty ; rdfs:domain cs:Example ; rdfs:range xsd:string .
cs:code a owl:DatatypeProperty ; rdfs:domain cs:Example ; rdfs:range xsd:string .

cs:cat.react a cs:Category ; cs:slug "react" .
cs:cat.code a cs:Category ; cs:slug "code" .

cs:react.component.props a cs:CodeStandard ;
  cs:name "react/component/props" ;
  cs:description "Type component props explicitly." ;
  cs:hasCategory cs:cat.react ;
  cs:do [ a cs:Example ; cs:description "Do type props" ; cs:language "tsx" ; cs:code "interface P {}" ] ;
  cs:dont [ a cs:Example ; cs:description "Avoid any" ; cs:language "tsx" ; cs:code "props: any" ] .

cs:react.component.structure a cs:CodeStandard ;
  cs:name "react/component/structure" ;
  cs:description "Keep folder structure flat." ;
  cs:hasCategory cs:cat.react ;
  cs:extends cs:react.component.props ;
  cs:do [ a cs:Example ; cs:description "Do flatten" ; cs:language "text" ; cs:code "src/Button.tsx" ] .

cs:code.function.purity a cs:CodeStandard ;
  cs:name "code/function/purity" ;
  cs:description "Prefer pure functions." ;
  cs:hasCategory cs:cat.code .
`;

const verbs = () =>
  compilePack(standardPack, "bundled:standard", DEFAULT_PREFIX_MAP);
const verb = (label: string) =>
  verbs().find((v) => verbKey(v.path) === `standard ${label}`) as VerbSpec;

let rt: PragmaRuntime;
beforeAll(async () => {
  ({ rt } = await buildFixtureRuntime({ ttl: TTL, prefixes: PREFIXES }));
});
afterAll(async () => {
  (await rt.store.get()).store.dispose();
});

async function lookupAt(
  name: string,
  detail?: "summary" | "standard" | "detailed",
): Promise<Record<string, unknown>> {
  const runtime = detail
    ? { ...rt, globalFlags: { ...rt.globalFlags, detail } }
    : rt;
  const out = (await verb("lookup").run(
    { name: [name] },
    runtime,
  )) as LookupOutput;
  return out.results.at(0) as Record<string, unknown>;
}

describe("standard pack definition (PROTECTED)", () => {
  it("round-trips as declarative JSON and validates", () => {
    expect(
      parsePackDefinition(JSON.parse(JSON.stringify(standardPack)), "t"),
    ).toEqual(standardPack);
  });
});

describe("standard list parity", () => {
  it("lists every standard with the uniform row shape", async () => {
    const rows = (await verb("list").run({}, rt)) as PackRow[];
    expect(rows.map((r) => r.name)).toEqual([
      "code/function/purity",
      "react/component/props",
      "react/component/structure",
    ]);
    for (const row of rows) {
      expect(row.uri).toBeTruthy();
      expect(row.description).toBeTruthy();
    }
  });

  it("filters by category and searches, conjunctively", async () => {
    const react = (await verb("list").run(
      { category: "react" },
      rt,
    )) as PackRow[];
    expect(react.map((r) => r.name).sort()).toEqual([
      "react/component/props",
      "react/component/structure",
    ]);
    const searched = (await verb("list").run(
      { category: "react", search: "structure" },
      rt,
    )) as PackRow[];
    expect(searched.map((r) => r.name)).toEqual(["react/component/structure"]);
  });
});

describe("standard categories parity", () => {
  it("lists categories with their standard counts", async () => {
    const rows = (await verb("categories").run({}, rt)) as PackRow[];
    const counts = new Map(rows.map((r) => [r.name, Number(r.count)]));
    expect(counts.get("react")).toBe(2);
    expect(counts.get("code")).toBe(1);
  });
});

describe("standard lookup parity — canonical disclosure", () => {
  it("summary resolves base fields, no dos/donts", async () => {
    const entity = await lookupAt("react/component/props", "summary");
    expect(entity.name).toBe("react/component/props");
    expect(entity.category).toBe("react");
    expect(entity.description).toBe("Type component props explicitly.");
    expect(entity.dos).toBeUndefined();
    expect(entity.donts).toBeUndefined();
  });

  it("standard fetches dos; detailed fetches dos AND donts", async () => {
    const atStandard = await lookupAt("react/component/props", "standard");
    expect((atStandard.dos as unknown[]).length).toBeGreaterThan(0);
    expect(atStandard.donts).toBeUndefined();

    const atDetailed = await lookupAt("react/component/props", "detailed");
    expect((atDetailed.dos as { code: string }[])[0]?.code).toBe(
      "interface P {}",
    );
    expect((atDetailed.donts as { caption: string }[])[0]?.caption).toBe(
      "Avoid any",
    );
  });

  it("keeps cs:extends as the raw IRI in data", async () => {
    const entity = await lookupAt("react/component/structure");
    expect(entity.extends).toBe(`${CS}react.component.props`);
  });

  it("resolves the same entity by name and by prefixed name", async () => {
    const byName = await lookupAt("react/component/props");
    const byPrefixed = await lookupAt("cs:react.component.props");
    expect(byPrefixed.name).toBe(byName.name);
  });

  it("expands globs and reports misses with suggestions", async () => {
    const out = (await verb("lookup").run(
      { name: ["react/component/*"] },
      rt,
    )) as LookupOutput;
    expect(out.results.map((e) => e.name).sort()).toEqual([
      "react/component/props",
      "react/component/structure",
    ]);
    await expect(
      verb("lookup").run({ name: ["react/component/prop"] }, rt),
    ).rejects.toThrow(/not found/i);
  });
});

describe("standard sample parity", () => {
  it("returns N full exemplars with the population size", async () => {
    const data = (await verb("sample").run({ count: "2" }, rt)) as {
      samples: unknown[];
      totalCount: number;
    };
    expect(data.samples).toHaveLength(2);
    expect(data.totalCount).toBe(3);
  });
});
