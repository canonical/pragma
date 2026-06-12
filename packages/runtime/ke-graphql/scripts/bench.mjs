// Cold-start + query-shape benchmark. Run after `bun run build`:
//   node scripts/bench.mjs   (or bun scripts/bench.mjs)
// Keeps the numbers in the ADR/README honest across changes.

import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const t0 = performance.now();
const mark = (label, since) => {
  const now = performance.now();
  console.log(`${label.padEnd(44)} ${(now - since).toFixed(1).padStart(8)} ms`);
  return now;
};

const N = 250;
const ttl =
  `
@prefix ds: <https://ds.canonical.com/> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
ds:Entity a owl:Class . ds:UIElement a owl:Class ; rdfs:subClassOf ds:Entity .
ds:UIBlock a owl:Class ; rdfs:subClassOf ds:UIElement .
ds:Component a owl:Class ; rdfs:subClassOf ds:UIBlock .
ds:Tier a owl:Class ; rdfs:subClassOf ds:Entity .
ds:Property a owl:Class ; rdfs:subClassOf ds:Entity .
ds:name a owl:DatatypeProperty ; rdfs:domain ds:Entity ; rdfs:range xsd:string .
ds:summary a owl:DatatypeProperty ; rdfs:domain ds:Entity ; rdfs:range xsd:string .
ds:tier a owl:ObjectProperty , owl:FunctionalProperty ; rdfs:domain ds:UIBlock ; rdfs:range ds:Tier .
ds:hasProperty a owl:ObjectProperty ; rdfs:domain ds:UIBlock ; rdfs:range ds:Property .
ds:propertyType a owl:DatatypeProperty ; rdfs:domain ds:Property ; rdfs:range xsd:string .
ds:optional a owl:DatatypeProperty , owl:FunctionalProperty ; rdfs:domain ds:Property ; rdfs:range xsd:boolean .
ds:global a ds:Tier ; ds:name "global" .
` +
  Array.from(
    { length: N },
    (_, i) => `
ds:global.component.c${i} a ds:Component ; ds:name "C${i}" ; ds:summary "S${i}" ; ds:tier ds:global ;
  ds:hasProperty [ a ds:Property ; ds:name "disabled" ; ds:propertyType "boolean" ; ds:optional "false" ] .`,
  ).join("\n");

let t = t0;
const { createStore } = await import("@canonical/ke");
const {
  compile,
  compileFromExtraction,
  serializeExtraction,
  hashSources,
  storeQueryFn,
  executeLocal,
} = await import("../dist/esm/index.js");
t = mark("import modules", t);

const dir = mkdtempSync(join(tmpdir(), "kg-bench-"));
const file = join(dir, "g.ttl");
writeFileSync(file, ttl);
const prefixes = { ds: "https://ds.canonical.com/" };
const store = await createStore({ sources: [file], prefixes });
t = mark(`createStore (WASM + ${N * 6 + 20} triples)`, t);

const live = await compile(storeQueryFn(store), prefixes, {
  mappings: { "ds:hasProperty": { graphqlName: "properties" } },
});
t = mark("compile() live (Pass 1 + 2-7 + validate)", t);

const artifact = serializeExtraction(live.extraction, hashSources([ttl]));
const result = compileFromExtraction(artifact, {
  mappings: { "ds:hasProperty": { graphqlName: "properties" } },
  loaderCache: "process",
});
t = mark("compileFromExtraction (artifact boot)", t);

const run = (source) =>
  executeLocal({
    schema: result.schema,
    source,
    contextValue: result.createContext(store),
  });

const time = async (label, source, iters = 50) => {
  await run(source); // warmup
  const start = performance.now();
  for (let i = 0; i < iters; i++) {
    await run(source);
  }
  console.log(
    `${label.padEnd(44)} ${((performance.now() - start) / iters).toFixed(2).padStart(8)} ms`,
  );
};

await time(
  "detail page (1 entity + tier + blanks)",
  `{ component(uri: "ds:global.component.c42") { id name summary tier { name } properties { name optional } } }`,
);
await time(
  `listing first:24 (slice-before-hydrate)`,
  `{ components(first: 24) { edges { node { id name } } pageInfo { hasNextPage } } }`,
);
await time(
  "TBox class + ClassProperties (store-free)",
  `{ ontologyClass(uri: "https://ds.canonical.com/Component") { label properties { property { label } required } } }`,
);
console.log(
  `${"TOTAL boot -> ready".padEnd(44)} ${(t - t0).toFixed(1).padStart(8)} ms`,
);
