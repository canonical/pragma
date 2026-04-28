<!-- Reference README: this is the voice standard for all package READMEs -->

# @canonical/ke

Headless triple store runtime built on [Oxigraph](https://oxigraph.org/) WASM. Load RDF data, query it with SPARQL, get typed results.

ke is a library, not a server. Import it, call `createStore()`, and query in-process. No HTTP, no daemon, no port allocation. The consumer controls the lifecycle.

## Installation

```bash
bun add @canonical/ke
```

## Quick start

```typescript
import { createStore, sparql } from "@canonical/ke";

const store = await createStore({
  sources: ["./ontology.ttl", "./data/**/*.ttl"],
  prefixes: {
    ds: "https://ds.canonical.com/",
    schema: "http://schema.org/",
  },
});

const result = await store.query(
  sparql`SELECT ?name WHERE { ?c a ds:UIBlock ; ds:name ?name }`
);
// result.type === "select"
// result.bindings === [{ name: "Button" }, { name: "Card" }, ...]
```

## Sources

A store needs data. Sources tell ke where to find it---file paths, glob patterns, or detailed config objects:

```typescript
const store = await createStore({
  sources: [
    // Simple: file path or glob
    "./ontology.ttl",
    "./data/**/*.ttl",

    // Detailed: control named graph assignment and format
    {
      patterns: ["./standards/**/*.ttl"],
      graph: "urn:pragma:standards",
      format: "turtle",
    },
  ],
});
```

Globs are resolved at creation time. Each file is read and parsed by Oxigraph. Format is auto-detected from extension (`.ttl` → Turtle, `.nt` → N-Triples, `.rdf` → RDF/XML). For control over which graph receives the data, use the detailed form.

## Prefixes

SPARQL queries require full IRIs by default: `<https://ds.canonical.com/UIBlock>`. Prefixes shorten that to `ds:UIBlock`.

Register namespace prefixes once at store creation. They are prepended as `PREFIX` declarations to every query automatically:

```typescript
const store = await createStore({
  sources: ["./data.ttl"],
  prefixes: {
    ds: "https://ds.canonical.com/",
    cso: "http://pragma.canonical.com/codestandards#",
    schema: "http://schema.org/",
  },
});

const result = await store.query(
  sparql`SELECT ?name WHERE { ?c a ds:UIBlock ; ds:name ?name }`
);

console.log(store.prefixes);
// { ds: "https://ds.canonical.com/", cso: "http://pragma...", schema: "http://schema..." }
```

## Queries

ke supports three SPARQL query forms, each returning a different result shape.

### SELECT — variable bindings

```typescript
const result = await store.query(
  sparql`SELECT ?name ?tier WHERE { ?c a ds:UIBlock ; ds:name ?name ; ds:tier ?tier }`
);
// result.type === "select"
// result.variables === ["name", "tier"]
// result.bindings === [{ name: "Button", tier: "global" }, ...]
```

### CONSTRUCT — triples

```typescript
const result = await store.query(
  sparql`CONSTRUCT { ?c ds:name ?name } WHERE { ?c a ds:UIBlock ; ds:name ?name }`
);
// result.type === "construct"
// result.triples === [{ subject: "https://...", predicate: "https://...", object: "Button" }, ...]
```

### ASK — boolean

```typescript
const result = await store.query(
  sparql`ASK { <https://ds.canonical.com/component.button> a ds:UIBlock }`
);
// result.type === "ask"
// result.result === true
```

### Type inference

The return type is narrowed at compile time based on the query string:

```typescript
const select = await store.query(sparql`SELECT ?x WHERE { ?x ?p ?o }`);
//     ^? SelectResult — TypeScript knows this is a SELECT

const ask = await store.query(sparql`ASK { ?s ?p ?o }`);
//     ^? AskResult — TypeScript knows this is an ASK
```

## SPARQL injection protection

User-supplied values in queries are a common injection vector. The `sparql` tagged template escapes all interpolated values:

```typescript
import { createNamespace, sparql } from "@canonical/ke";

const ds = createNamespace("https://ds.canonical.com/");
const userInput = "Button";

const query = sparql`SELECT ?c WHERE { ?c a ${ds("UIBlock")} ; ds:name ${userInput} }`;
// → SELECT ?c WHERE { ?c a <https://ds.canonical.com/UIBlock> ; ds:name "Button" }
//   URIs get <brackets>, strings get "quotes" with special chars escaped
```

Dangerous patterns are rejected outright:

```typescript
sparql`SELECT ?c WHERE { ?c ds:name ${"} UNION { ?x ?y ?z"} }`;
// → throws: "Potentially dangerous SPARQL value rejected"
```

## Namespace helpers

Full IRIs in code are verbose and error-prone. Namespace helpers create typed URI constructors:

```typescript
import { createNamespace, sparql } from "@canonical/ke";

const ds = createNamespace("https://ds.canonical.com/");
const rdf = createNamespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#");

const query = sparql`SELECT ?name WHERE { ?c ${rdf("type")} ${ds("UIBlock")} ; ${ds("name")} ?name }`;
// → SELECT ?name WHERE { ?c <http://www.w3.org/.../type> <https://ds.../UIBlock> ; <https://ds.../name> ?name }
```

## Plugins

The store lifecycle is extensible through plugins. Three hooks, called in array order:

```typescript
import { createStore, definePlugin } from "@canonical/ke";

const logger = definePlugin({
  name: "logger",
  onLoad(source) {
    console.log(`Loading: ${source.path} (${source.format})`);
  },
  onQuery(sparql) {
    console.log(`Query: ${sparql.slice(0, 80)}...`);
    // Return a string to rewrite the query, or void to pass through
  },
  onResult(result) {
    console.log(`Result: ${result.type}`);
    // Return a modified result, or void to pass through
  },
});

const store = await createStore({
  sources: ["./data.ttl"],
  plugins: [logger],
});
```

## Cache

Parsing large TTL datasets on every boot is slow. The cache option serialises the store to N-Quads after first load, bypassing source resolution and parsing on subsequent boots:

```typescript
const store = await createStore({
  sources: ["./large-dataset/**/*.ttl"],
  cache: "./.cache/ke-store.nq",
});
// First boot: resolves globs, reads files, parses TTL, writes cache
// Subsequent boots: loads from cache (skips source resolution + parsing)

// Force a full reload (bypasses cache)
await store.reload({ force: true });
```

## HTTP handler

ke runs in-process by default, but the SPARQL Protocol handler at `@canonical/ke/http` exposes the store over HTTP when needed:

```typescript
import { createStore } from "@canonical/ke";
import { createSparqlHandler } from "@canonical/ke/http";

const store = await createStore({ sources: ["./data.ttl"] });
const handler = createSparqlHandler(store, { cors: true, maxQueryLength: 10_000 });

Bun.serve({ fetch: handler, port: 3030 });
```

Supports GET `?query=`, POST `application/sparql-query`, and POST form-urlencoded per the [W3C SPARQL Protocol](https://www.w3.org/TR/sparql11-protocol/).

## Named graphs

Named graphs track where data comes from. Load sources into separate graphs for provenance, then query across all of them or scope to a specific graph:

```typescript
const store = await createStore({
  sources: [
    { patterns: ["./ontology.ttl"], graph: "urn:pragma:ontology" },
    { patterns: ["./data/*.ttl"], graph: "urn:pragma:data" },
    { patterns: ["./standards/*.ttl"], graph: "urn:pragma:standards" },
  ],
});

// All graphs are queryable by default (use_default_graph_as_union: true)
const all = await store.query(sparql`SELECT ?s WHERE { ?s a ds:UIBlock }`);

// Scope to a specific graph with GRAPH clause
const onlyData = await store.query(
  sparql`SELECT ?s WHERE { GRAPH <urn:pragma:data> { ?s a ds:UIBlock } }`
);
```

## Testing

| Aspect | Detail |
|--------|--------|
| Test files | 8 (unit + integration) |
| Environment | Node (vitest) |
| Coverage | 100% enforced (statements, branches, functions, lines) |
| Posture | Enforced |
| Visual regression | Not applicable (no UI) |

ke provides test utilities at `@canonical/ke/testing`:

```typescript
import { createTestStore, registerMatchers } from "@canonical/ke/testing";
import { sparql } from "@canonical/ke";

registerMatchers(); // adds toContainTriple, toContainBinding

test("finds components", async () => {
  const { store, cleanup } = await createTestStore({
    ttl: `
      @prefix ds: <https://ds.canonical.com/> .
      ds:button a ds:UIBlock ; ds:name "Button" .
    `,
    prefixes: { ds: "https://ds.canonical.com/" },
  });

  const result = await store.query(
    sparql`SELECT ?name WHERE { ?c a ds:UIBlock ; ds:name ?name }`
  );

  expect(result.bindings).toContainBinding("name", "Button");
  cleanup();
});
```

## API summary

| Export | Description |
|--------|-------------|
| `createStore(config)` | Create a store from TTL sources (sole entry point) |
| `sparql\`...\`` | Tagged template for safe SPARQL construction |
| `createNamespace(iri)` | Create a typed URI constructor |
| `definePlugin(plugin)` | Define a plugin with type inference |
| `escapeSparqlValue(v)` | Escape a value for SPARQL interpolation |
| `escapeSparqlURI(uri)` | Wrap a URI in angle brackets |
| `markAsURI(str)` | Mark a string as a URI at runtime |

### Sub-path exports

| Import path | Description |
|-------------|-------------|
| `@canonical/ke` | Core API |
| `@canonical/ke/http` | SPARQL Protocol HTTP handler |
| `@canonical/ke/testing` | Test utilities (createTestStore, matchers) |

## Trade-offs

ke uses Oxigraph compiled to WASM. This means the store runs anywhere JavaScript runs---Node, Bun, browsers---without native dependencies. The trade-off is a ~4MB WASM binary added to the bundle, and Oxigraph's SPARQL coverage, which implements SPARQL 1.1 Query but not SPARQL 1.1 Update (no INSERT/DELETE). Data mutation happens through `reload()`, not through SPARQL.

## Licence

LGPL-3.0
