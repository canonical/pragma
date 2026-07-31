# @canonical/ke-graphql

OWL → GraphQL compiler for the [ke](../ke) triple store. Point it at a loaded store and it reads the ontology — classes, properties, domains and ranges, `subClassOf` chains, cardinality markers, SHACL shapes — and compiles a complete, executable `GraphQLSchema`: types, interfaces, field resolvers, batched data loading, and Relay server conventions. The ontology is the schema definition; there is nothing else to maintain.

It is a compiler, not a middleware. OWL is not a database schema — a class with no instances should become an interface, an `owl:inverseOf` pair should produce one field per side rather than four, a blank-node-only class can't have a global ID. Mapping that faithfully takes semantic analysis, so the package is built like a compiler: seven passes over a typed intermediate representation, diagnostics with stable codes that never abort on the first problem, and a deterministic output you can snapshot. `docs/architecture.md` is the full design rationale.

Like ke itself, the root export is a library, not a server: schema + resolvers + local execution, nothing that knows HTTP exists. The fetch handler and GraphiQL live behind the `./http` subpath, mirroring `@canonical/ke/http`.

## Installation

```bash
bun add @canonical/ke-graphql
```

`graphql` (v17, pinned — see [Incremental delivery](#incremental-delivery-defer)) and `dataloader` come with it; `@canonical/ke` is a peer dependency.

## Quick start

The compiler runs as a ke plugin: when the store finishes loading, the schema is ready alongside it.

```typescript
import { createStore } from "@canonical/ke";
import { createSchemaPlugin, type SchemaPluginApi } from "@canonical/ke-graphql";
import { createGraphQLHandler } from "@canonical/ke-graphql/http";

const graphql = createSchemaPlugin();

const store = await createStore({
  sources: ["./ontology.ttl", "./data/**/*.ttl"],
  prefixes: { lib: "https://example.org/library/" }, // display prefixes + the `lib:dune` lookup shorthand
  plugins: [graphql],
});

const { schema, sdl, createContext } = store.api<SchemaPluginApi>("ke-graphql")!;

Bun.serve({
  port: 4000,
  fetch: createGraphQLHandler(schema, {
    graphiql: true,
    context: () => createContext(store),
  }),
});
```

Open `http://localhost:4000` and GraphiQL is talking to your ontology.

## What gets generated

Everything below is the compiler's actual output for this input — regenerate it any time with `pragma graphql build`.

Given a small ontology and some data:

```turtle
@prefix lib: <https://example.org/library/> .

lib:Work a owl:Class .
lib:Book a owl:Class ; rdfs:subClassOf lib:Work .
lib:Film a owl:Class ; rdfs:subClassOf lib:Work .
lib:Author a owl:Class .
lib:Review a owl:Class .

lib:title     a owl:DatatypeProperty ; rdfs:domain lib:Work   ; rdfs:range xsd:string .
lib:pageCount a owl:DatatypeProperty ; rdfs:domain lib:Book   ; rdfs:range xsd:integer .
lib:inPrint   a owl:DatatypeProperty ; rdfs:domain lib:Book   ; rdfs:range xsd:boolean .
lib:hasAuthor a owl:ObjectProperty   ; rdfs:domain lib:Work   ; rdfs:range lib:Author ;
              owl:inverseOf lib:authored .
lib:authored  a owl:ObjectProperty   ; rdfs:domain lib:Author ; rdfs:range lib:Work .
lib:name      a owl:DatatypeProperty ; rdfs:domain lib:Author ; rdfs:range xsd:string .
lib:hasReview a owl:ObjectProperty   ; rdfs:domain lib:Work   ; rdfs:range lib:Review .
lib:rating    a owl:DatatypeProperty ; rdfs:domain lib:Review ; rdfs:range xsd:integer .
lib:comment   a owl:DatatypeProperty ; rdfs:domain lib:Review ; rdfs:range xsd:string .

lib:dune a lib:Book ;
  lib:title "Dune" ; lib:pageCount 412 ; lib:inPrint "true" ;
  lib:hasAuthor lib:herbert ;
  lib:hasReview [ a lib:Review ; lib:rating 5 ] .
lib:herbert a lib:Author ; lib:name "Frank Herbert" .
```

the compiler emits the following (fields lightly reordered for reading, Relay boilerplate and the TBox types elided — `pragma graphql build` regenerates the full file):

```graphql
# ke-graphql · canonical SDL
# graphql-schema-spec: 1
# provider: unknown
# mode: annotated
# validated-store: false
# revision: 0
# prefixing: none

interface Node {           # identity + self-description, and nothing else
  uri: ID!
  _meta: EntityMeta!
}

type EntityMeta {          # every generic answer lives here, off the data surface
  title(lang: String = "en"): String!    # TOTAL — never null, always renderable
  label(lang: String = "en"): String
  comment(lang: String = "en"): String
  definition(lang: String = "en"): String
  type: OntologyClass!
  field(name: String!): ClassProperty
  fields: [ClassProperty!]!
}

interface Work implements Node {
  uri: ID!
  _meta: EntityMeta!
  title: String
  authors(first: Int, after: String, last: Int, before: String): AuthorConnection!
  reviews: [Review!]!
}

type Book implements Node & Work {
  uri: ID!                 # the absolute IRI: "https://example.org/library/dune"
  _meta: EntityMeta!
  title: String
  pageCount: Int
  inPrint: Boolean         # data stores "true" as a string — the resolver coerces
  authors(first: Int, after: String, last: Int, before: String): AuthorConnection!
  reviews: [Review!]!      # plain list — Review instances are blank nodes
}

type Author implements Node {
  uri: ID!
  _meta: EntityMeta!
  name: String
  authoreds(first: Int, after: String, last: Int, before: String): WorkConnection!
}

type Review {              # embeddable: no Node, no uri — it lives inside its parent
  _meta: EntityMeta!       # …but it still knows its own class
  rating: Int
  comment: String
}

type Query {
  node(id: ID!): Node
  book(uri: String!): Book
  books(first: Int, after: String, last: Int, before: String): BookConnection!
  author(uri: String!): Author
  authors(first: Int, after: String, last: Int, before: String): AuthorConnection!
  film(uri: String!): Film
  films(first: Int, after: String, last: Int, before: String): FilmConnection!
  ontologies: [Ontology!]!
  ontology(prefix: String!): Ontology
  ontologyClass(uri: String!): OntologyClass
  ontologyProperty(uri: String!): OntologyProperty
}
```

Reading the output back against the input shows most of the compiler's rules at once:

- **`Work` became an interface.** It has subclasses and no direct instances, so it's abstract — and because all of its concrete implementors are full entities, the interface itself implements `Node`, which is what lets Relay refetch a fragment written against `Work`. (A class with subclasses *and* direct instances of its own stays a concrete type and earns a `V016` warning: a supertype-typed field can't surface its subclasses' fields. Force it abstract with `{ abstract: true }` when it has no direct instances; the interface-plus-companion-type alternative is a deferred option.)
- **`hasAuthor` became `authors`.** Field names strip a leading `has`/`is` verb; list fields are pluralized (`category → categories`, `child → children` — the pluralizer knows the irregulars).
- **`reviews` is a plain list while `authors` is a connection.** `Review` instances are blank nodes: no URI means no global ID, no cursor, no standalone resolution. The compiler marks such classes *embeddable* and resolves them inline from the parent's own triples. Everything URI-addressable gets a paginated Relay connection instead. An embeddable still carries `_meta`, because knowing your own class is a fact about the class, not about identity — and it means a class with zero properties of its own still compiles.
- **One field per side of the inverse pair, and direction doesn't matter.** `hasAuthor`/`authored` produce `Book.authors` and `Author.authoreds` — never the duplicates. At resolution time each side takes the union of forward and reverse assertions, so data written in either direction answers identically from both ends.
- **`inPrint: Boolean` works even though the data says `"true"`.** Real-world TTL stores booleans as strings; the resolver coerces (`"true"/"false"/"1"/"0"`) and reports anything else through the runtime-warning channel instead of crashing the response.
- **Identity is the absolute IRI**, not an opaque token and not a prefixed form. `uri: ID!` on every node, `node(id: "https://example.org/library/dune")`, the loader keys, and the connection cursors are all the same string — one currency, so an `after:` cursor can never quietly miss. The prefixed form survives in exactly one place: the singular `book(uri: "lib:dune")` lookup ARGUMENT, as a typing convenience. Rendering a prefixed URI is the consumer's job — `toPrefixed` is exported for it.
- **Everything generic moved behind `_meta`.** `title`/`label`/`comment`/`definition` are `EntityMeta` fields with a `lang` argument, so the whole data surface — every field name except `uri` and `_meta` — belongs to your ontology. `title` is total: it falls through label, then any-language literal, then the IRI local name, so a lens always has something to render.

About `authoreds` — that's the pluralizer being mechanically right and ergonomically wrong. Which brings us to:

## Custom mappings

Mappings are the escape hatch for everything the ontology can't express ergonomically. Keys are full IRIs or prefixed names; values override one aspect each:

```typescript
const graphql = createSchemaPlugin({
  mappings: {
    // rename: fix the mechanical plural
    "lib:authored": { graphqlName: "works" },

    // cardinality: an object property that is singular in practice but
    // carries no owl:FunctionalProperty or SHACL marker
    "lib:hasPublisher": { singular: true },

    // synthesize an inverse field on the RANGE type when the ontology
    // declares no owl:inverseOf — no ontology change required, the
    // resolver queries the forward assertions in reverse
    "lib:cites": { inverse: { graphqlName: "citedBy" } },

    // force embeddable/abstract when the loaded data can't reveal it
    // (e.g. a blank-node-only class that happens to have zero instances
    // in this particular dataset)
    "lib:Annotation": { embeddable: true },
  },
});
```

A mapping that references nothing in the ontology produces an `M003` diagnostic rather than silently doing nothing.

TYPE names the compiler owns (`Node`, `Query`, `PageInfo`, the built-in scalars, …) are auto-resolved on collision by prefixing the namespace — a class named `lib:Node` becomes `LibNode` with an `M004` info diagnostic. Illegal GraphQL characters in local names are sanitized (`My-Class → My_Class`) with an `M002` warning.

FIELD names are never silently renamed. The compiler owns exactly two — `uri` and `_meta` — and a property mapping onto either is **dropped** with an error-severity `M005` naming the IRI and both remedies; two properties mapping to one name drop the second with `M001` naming both IRIs. A rename would break the consumer's query just as surely while hiding which IRI caused it. Fix one clash with `mappings`; `prefixing: "all"`, which namespace-prefixes every generated field name (`lib:uri` → `libUri`), fixes every `M005` at once but only those `M001`s whose two IRIs come from different namespaces — same-namespace claimants (`ex:name` and `ex:hasName`, both stripping to `name`) take the same prefix and still collide.

## Cardinality: how a property becomes singular or a list

Precedence, highest first:

1. custom mapping `{ singular }` override
2. `owl:FunctionalProperty`
3. SHACL `sh:maxCount 1` — per *(class, property)* pair, so the same property can be singular on one class and a list on another; `sh:or` branches merge to the most permissive interpretation, repeated shapes for one path merge as the SHACL conjunction
4. kind default: **datatype and annotation properties are singular; object properties are lists.** (Multi-valued literals are the exception in RDF practice; opt a datatype property back into a list with `{ singular: false }`.)

Nullability is deliberate and honest: `uri` and `_meta` are non-null, list and connection fields are non-null with empty defaults — and *everything else is nullable*, because OWL ontologies don't promise completeness. SHACL `sh:minCount` is **recorded** (queryable as `ClassProperty.required`) but never auto-promoted to GraphQL non-null: a single missing value would take down whole responses. Consumers who know their data promote specific fields via `nonNullOverrides: { Book: ["title"] }`.

## The second schema: `_meta` and the ontology browser

The compiler emits two connected schemas. Alongside the data types, a hand-written TBox schema exposes the ontology itself — and every generated type carries a `_meta: EntityMeta!` field bridging the two:

```graphql
{
  book(uri: "lib:dune") {
    title
    _meta {
      title                                                 # generic, total, renderable
      label(lang: "en")                                     # generic, nullable
      type { label definition superclasses { label } }      # the OWL class
      fields {                                              # every applicable property
        property { label range acceptanceCriteria }
        required      # SHACL sh:minCount, for THIS class
        singular
        inherited     # declared on an ancestor vs Book itself
      }
    }
  }
  ontologyClass(uri: "https://example.org/library/Work") {
    isAbstract
    subclasses { label }
    instances(first: 10) { edges { node { uri } } }         # TBox → ABox hop
  }
}
```

This is what powers documentation UIs: "which fields *should* this entity have, which are required, what does good look like" — asked of the schema itself, in the same query as the data. The reflective surface reads the compiler's frozen IR, **not the store** — labels, definitions, cardinality, sub/superclasses, `isAbstract`, even `instanceCount` (a Pass 1 statistic) — so ontology browsing answers before the TTL finishes parsing and even against a disposed store, and it can't disagree with the schema's own shape because both came from the same compilation. The one exception is `OntologyClass.instances`: it hands back real entities, so it reaches the store through the same loaders as any data field and needs a live one.

## Diagnostics

The compiler collects problems instead of aborting on the first one (the `tsc` model). Every diagnostic has a stable code:

| Range | Meaning | Examples |
|---|---|---|
| `E001` | extraction/SPARQL failure | query failed, unregistered namespace (synthetic prefix assigned), blank nodes nested deeper than the loader's closure |
| `B001–B004` | build references | `subClassOf` cycle, unknown domain/range/inverse |
| `V001–V016` | data/ontology validation | blank-node-only class (`V001`), domainless property (`V002`), boolean-as-string (`V006`), SHACL `sh:maxCount 0` omission (`V010`), undeclared ABox predicate (`V014`), abstract mapping with direct instances (`V015`), concrete supertype flattening (`V016`) |
| `M001–M006` | naming | duplicate type or field name, later claimant dropped (`M001`, error), illegal class local name sanitized (`M002`), unknown mapping (`M003`), auto-resolved type collision (`M004`), property claims a structural field name and is dropped (`M005`, error), one union name minted with different member sets (`M006`, error) |
| `X002–X003` | union emission | named / synthesized union created |
| `W001` | Relay wiring | two root query fields claim one name, later field dropped (error) |
| `C001–C003` | composition | extension targets unknown type, extension field conflict (incl. a generated root field colliding with a TBox root field), `validateSchema` failure |

**Any error-severity diagnostic refuses the compile** — `compile()` throws `CompilationError` carrying the complete diagnostic list. A schema minus silently dropped fields must never be served, so a boot dies loudly instead. Warnings and infos surface in `result.diagnostics` while the schema builds; the consumer chooses its policy for those.

## Plugin options

```typescript
createSchemaPlugin({
  mappings,                          // CustomMappings (above)
  extensions,                        // consumer fields — object or factory form (below)
  relay: true,                       // Node/uri/_meta/connections/root queries (default true)
  incremental: false,                // add @defer/@stream directives (below)
  sdlOutput: "./schema.graphql",     // write the SDL on every compile that prints one — feed
                                     // relay-compiler (artifact boots skip printing and leave
                                     // the file untouched)
  nonNullOverrides: { Book: ["title"] },
  prefixing: "none",                 // or "all" — namespace-prefix EVERY field name
  mode: "annotated",                 // "auto" | "annotated" | "explicit" — provenance only today
  provider: "library",               // stamped into the SDL provenance header
  revision: "a1b2c3d",               // stamped into the SDL provenance header
  standardVocabFields: {             // DEPRECATED, superseded by the graphql:*From annotations:
    Category: { "http://www.w3.org/2000/01/rdf-schema#label": "label" },
  },                                 // opt-in instance-level rdfs:label/comment as ordinary fields
  loaderCache: "request",            // or "process" — see Performance
  extraction: "./extraction.json",   // precomputed boot artifact — see Fast boot
  onRuntimeWarning: (w) => log.warn(w),  // coercion failures at resolve time
});
```

`onReload` recompiles when the store reloads — note that with ke's `cache:` configured, `store.reload()` short-circuits on a cache hit, so dev flows that edit TTL should call `reload({ force: true })`.

## Extensions

Domain-specific computed fields stay out of the compiler and in your code. The object form covers scalar-typed fields; the **factory form** receives the generated types, for extension fields typed as them:

```typescript
extensions: (types) => ({
  Book: {
    citation: {
      type: GraphQLString,
      resolve: (book) => formatCitation(book),       // book is an EntityValue
    },
  },
  Query: {
    search: {
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(SearchHitType))),
      args: { query: { type: new GraphQLNonNull(GraphQLString) } },
      resolve: (_s, args, ctx) => ctx.searchIndex.search(args.query),
    },
  },
})
```

Extensions are validated at composition: an unknown type name is `C001`, a clash with a generated field is `C002` — both fatal, both reported together. Extension resolvers receive the `CompilerContext` (the loaders, the name map, the store escape hatch) and may stash their own state on it.

## Serving over HTTP

```typescript
import { createGraphQLHandler } from "@canonical/ke-graphql/http";

const handler = createGraphQLHandler(schema, {
  context: (request) => createContext(store),   // fresh DataLoaders per request
  graphiql: true,            // GET + Accept: text/html → GraphiQL (dev default)
  cors: true,
  introspection: true,       // default: dev on, production off
  maxDepth: 12,              // built-in depth limit (default 20; 0 disables)
  validationRules: [         // add your own rules on top (e.g. cost analysis)
    createComplexityRule({ maximumComplexity: 1000, estimators: [...] }),
  ],
  persistedQueries: {        // strongest hardening: only build-time queries execute
    get: (hash) => manifest[hash] ?? null,
    allowArbitraryQueries: false,
  },
  hideFieldSuggestions: true,   // no "Did you mean…?" schema enumeration (prod default)
  maskErrors: true,             // generic message for internal errors (prod default)
  formatError: (e) => redact(e),
  onOperation: ({ operation, duration, errors }) => metrics.record(...),
});

Bun.serve({ fetch: handler });   // or compose with other handlers by pathname
```

The handler is a plain `(Request) => Promise<Response>` — no framework, same composition pattern as `createSparqlHandler`. It implements GraphQL-over-HTTP (GET with query param, POST JSON, persisted-query extension), answers CORS preflight, honors `Accept` q-values, and serves nothing it wasn't asked to: the handler provides *seams*, the consumer provides *policy*. Build the persisted manifest from your client's compiled operations with `createPersistedManifest(operationTexts)` (SHA-256, the Relay/Apollo convention).

**Built-in hardening defaults.** On top of those seams, the package ships a baseline production posture from its `hardening` domain (all named, exported, and tunable — never magic numbers buried in a resolver): every connection is page-size-clamped (`DEFAULT_PAGE_SIZE` 50, `MAX_PAGE_SIZE` 100), so a list is never unbounded and a client can't demand an oversized page; queries nested deeper than `maxDepth` (default `DEFAULT_MAX_QUERY_DEPTH`, 20) are rejected, bounding the recursion that cyclic types otherwise allow; IRIs that would break out of a SPARQL `IRIREF` are dropped before interpolation, so a crafted `node(id:)` resolves to `null` rather than injected SPARQL; and in production (`maskErrors`, default on) an unexpected internal error is returned as a generic message — store and SPARQL internals never reach the client, while deliberate validation/argument errors pass through. `loaderCache: "process"` uses bounded LRU caches (next section) so ID enumeration can't exhaust memory.

GraphiQL's assets load as version-pinned UMD bundles from unpkg; air-gapped deployments supply their own page through the `graphiqlHtml` option.

## Incremental delivery (`@defer`)

`incremental: true` on the plugin adds the `@defer`/`@stream` directives (graphql v17 doesn't define them by default), and `incremental: true` on the handler streams deferred payloads as `multipart/mixed` to clients that accept it — everyone else gets a single, complete, drained-and-merged JSON response. Correctness can't be lost to a transport mismatch, only streaming.

One ecosystem wrinkle this package absorbs for you: graphql v17 emits the 2023 incremental payload format (`pending`/`incremental`/`completed`), while Relay's network layer still consumes the legacy shape (`path`/`label` per payload, `is_final`). The `relayFormatAdapter` translates between them — used in-process for SSR and by the handler's `incrementalFormat: "relay-legacy"` option. This is also why `graphql` is **pinned exactly**: the adapter is coupled to the RC's payload format, and upgrades should be deliberate, snapshot-diffed events.

## Executing without a server

The compiled schema is a value and `graphql(schema, query, context)` is a function call — every serving mode is a thin shell over it:

```typescript
import { executeLocal, extractStatic } from "@canonical/ke-graphql";

// In-process (SSR prefetch, tests, scripts) — no HTTP, no serialization.
// One context per render pass: DataLoaders batch across every concurrent
// Relay query in the same render.
const result = await executeLocal({
  schema,
  source: `{ books(first: 24) { edges { node { title } } } }`,
  contextValue: createContext(store),
});

// Build time (static sites, CDN): run the site's whole query set once,
// ship the results as JSON. uri-typed variables are enumerated against
// the store's own instance inventory; anything non-enumerable
// (pagination cursors) fails loudly instead of shipping partial data.
const artifacts = await extractStatic({
  schema, mapped: result.mapped, context: createContext(store),
  queries: [
    { name: "AllBooks", text: "{ books(first: 500) { edges { node { uri title } } } }" },
    { name: "BookPage",
      text: "query($uri: String!) { book(uri: $uri) { title authors(first: 10) { edges { node { name } } } } }",
      variables: { uri: "String!" } },
  ],
});
```

## Fast boot: the extraction artifact

Pass 1 (the SPARQL extraction) is the only part of compilation that needs the store — and its output is ~2 KiB of serializable JSON. Snapshot it at build time and every subsequent boot skips the store entirely:

```bash
pragma graphql build ./ontology.ttl "./data/**/*.ttl" \
  --sdl schema.graphql --extraction extraction.json \
  --prefix lib=https://example.org/library/
```

```typescript
// boots the schema in ~10 ms — no Oxigraph, no TTL parse, no SPARQL
createSchemaPlugin({ extraction: "./extraction.json" });

// or with no store at all until the first data query:
import { compileFromExtraction } from "@canonical/ke-graphql";
const result = compileFromExtraction(artifactJson, { loaderCache: "process" });
const storeReady = createStore({ sources, prefixes });   // not awaited!
const ctx = result.createContext(storeReady);            // TBox answers now;
                                                         // data queries await the store
```

The artifact embeds a `sourcesHash` fingerprint of the TTL it was built from. The plugin re-fingerprints the sources as ke loads them: match → fast boot; mismatch → a warning and a live compile. A stale artifact can cost you milliseconds, never wrong answers. `pragma graphql check` runs the same compile with no outputs and fails on error diagnostics — the CI gate that puts ontology changes under the same discipline as code.

## Performance

Measured by the committed benchmark (`bun run bench`, 250-entity graph):

| Path | Cost |
|---|---|
| Schema boot from artifact (`compileFromExtraction`) | **~10 ms** — no store |
| Live compile (Pass 1 + passes 2–7 + validate) | ~50–110 ms |
| Detail page / `node()` with `loaderCache: "process"` | **~0.3 ms** |
| Listing `first: 24` | **~0.7 ms** warm — pagination runs on the URI list; only the page hydrates |
| TBox / ontology browsing | ~0.1 ms — store-free |

`loaderCache: "process"` shares DataLoader caches across requests — sound because the store is immutable between reloads, and a reload produces a new compile (automatic invalidation). The shared caches are **bounded LRUs** (`processCacheSize`, default 10,000 entries each), so enumerating distinct IDs can't grow them without limit; evicted entries are simply re-queried, and failed batches are evicted, never memoized. The default `"request"` keeps the textbook per-request isolation.

The ladder to zero: a warm process answers in microseconds; Lambda-style containers pay one ~80 ms boot per container with the artifact; Cloudflare Workers (WASM precompiled at deploy, TTL as ke inline sources — see `examples/cloudflare-worker`) cold-start in ~25–60 ms; and with persisted queries in front of a CDN, responses are pure functions of *(hash, variables)* until the next deploy — cacheable to 0 ms. For fully static deployments, `extractStatic` removes the runtime altogether.

## Package boundary

| Entry | Exports | Dependencies |
|---|---|---|
| `@canonical/ke-graphql` | `createSchemaPlugin`, `compile`, `compileFromExtraction`, `serializeExtraction`/`deserializeExtraction`/`hashSources`, `executeLocal`, `extractStatic`, `mergeIncremental`, `relayFormatAdapter`, `createPersistedManifest`, connection/pagination helpers, all IR + diagnostic types | `graphql` (pinned), `dataloader` |
| `@canonical/ke-graphql/http` | `createGraphQLHandler`, `graphiqlHtml` | the root, plus platform-native fetch |

Consumers that never serve — static extraction in CI, SSR-only processes, tests — never load a byte of HTTP or GraphiQL code.

## Development

```bash
bun run demo     # GraphiQL on http://localhost:4000/graphql in under a second
bun run test     # the fixture-suite tests, with coverage gates
bun run check    # biome + tsc + webarchitect
bun run bench    # the numbers in this README
```

`bun run demo` boots `demo/server.ts` against `demo/graph.ttl` — the library
ontology from this README with a few shelves of data — logging ke's load
activity (sources, triple counts), the compiler diagnostics, and a ready-made
`curl`. It serves GraphQL + GraphiQL with `@defer` enabled, so every example
above can be pasted straight in. The folder is type-checked and linted with
the package but ships nowhere: it is excluded from the build and the npm
tarball.

The intermediate representations (`RawExtraction`, `OntologyIR`, `MappedIR`) are exported public contracts, not internals — tooling can consume them the way Prisma generators consume the DMMF. They are pinned by the golden-SDL snapshot in the test suite, so changes to the emitted shape are caught.
