# @canonical/ke

Headless triple store runtime built on [Oxigraph](https://oxigraph.org/) WASM. Load RDF data, query it with SPARQL, get typed results.

ke is a library, not a server. You import it, call `createStore()`, and query in-process. No HTTP, no daemon, no port allocation. The consumer controls the lifecycle.

## Installation

```bash
bun add @canonical/ke
```

## Quick Start

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

Sources tell ke where to find RDF data. Pass file paths, glob patterns, or detailed config objects:

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

Globs are resolved at creation time. Each file is read and parsed by Oxigraph. Format is auto-detected from extension (`.ttl` → Turtle, `.nt` → N-Triples, `.rdf` → RDF/XML).

## Prefixes

Register namespace prefixes once at store creation. They're automatically prepended as `PREFIX` declarations to every query:

```typescript
const store = await createStore({
  sources: ["./data.ttl"],
  prefixes: {
    ds: "https://ds.canonical.com/",
    cso: "http://pragma.canonical.com/codestandards#",
    schema: "http://schema.org/",
  },
});

// No need to write PREFIX declarations in queries — they're added automatically
const result = await store.query(
  sparql`SELECT ?name WHERE { ?c a ds:UIBlock ; ds:name ?name }`
);

// Inspect registered prefixes
console.log(store.prefixes);
// { ds: "https://ds.canonical.com/", cso: "http://pragma...", schema: "http://schema..." }
```

Without prefixes, you'd need full IRIs: `<https://ds.canonical.com/UIBlock>`. Prefixes turn that into `ds:UIBlock`.

## Queries

ke supports three SPARQL query forms, each returning a different result shape:

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

## SPARQL Injection Protection

The `sparql` tagged template escapes all interpolated values:

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

## Namespace Helpers

Create typed URI constructors for use in SPARQL interpolation:

```typescript
import { createNamespace, sparql } from "@canonical/ke";

const ds = createNamespace("https://ds.canonical.com/");
const rdf = createNamespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#");

// URIs created by namespace helpers are recognized by the sparql tag
const query = sparql`SELECT ?name WHERE { ?c ${rdf("type")} ${ds("UIBlock")} ; ${ds("name")} ?name }`;
// → SELECT ?name WHERE { ?c <http://www.w3.org/.../type> <https://ds.../UIBlock> ; <https://ds.../name> ?name }
```

## Plugins

Plugins hook into the store lifecycle. Three hooks, called in array order:

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

Serialise the store to N-Quads after first boot for faster subsequent loads:

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

## HTTP Handler

For serving SPARQL over HTTP, ke provides a composable fetch handler at `@canonical/ke/http`. You bring the server, ke brings the SPARQL Protocol handling:

```typescript
import { createStore } from "@canonical/ke";
import { createSparqlHandler } from "@canonical/ke/http";

const store = await createStore({ sources: ["./data.ttl"] });
const handler = createSparqlHandler(store, { cors: true, maxQueryLength: 10_000 });

Bun.serve({ fetch: handler, port: 3030 });
```

Supports GET `?query=`, POST `application/sparql-query`, and POST form-urlencoded per the [W3C SPARQL Protocol](https://www.w3.org/TR/sparql11-protocol/).

## Named Graphs

Load sources into named graphs for provenance tracking:

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

## API Summary

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

## License

LGPL-3.0
