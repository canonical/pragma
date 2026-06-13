# Architecture — `@canonical/ke-graphql`

This is the design companion to the `A.10.COMPILER` ADR (pragma-adrs, `session/A`, decisions KG.01–KG.23). The README is the narrative introduction and `docs/api.md` is the export-by-export reference; this document explains *how the package is built and why*.

## 1. What it is

`@canonical/ke-graphql` is a **compiler**, not middleware. It reads an OWL/RDFS ontology (the TBox) plus its instance data (the ABox) from a [`@canonical/ke`](../../ke) triple store and emits an executable `GraphQLSchema` with resolvers. The mapping is not mechanical: a class with no instances should become an interface, an `owl:inverseOf` pair should produce one field per side rather than four, a blank-node-only class can't have a global ID. Faithful translation takes semantic analysis, so the package is structured like a compiler — passes over a typed intermediate representation, diagnostics with stable codes that never abort on the first problem, and deterministic output you can snapshot.

```
ke store ──► [ 7 passes ] ──► GraphQLSchema + resolvers ──► (local execution | /http handler)
                  │
                  └─ typed IRs: RawExtraction → OntologyIR → MappedIR → SchemaPlan
```

## 2. The seven passes

Each pass is a pure function from one IR to the next (Pass 1 is the only one that touches the store). The pipeline lives in `src/lib/compiler/`.

| Pass | File | In → Out | Responsibility |
|---|---|---|---|
| 1 Extract | `extract.ts` | store → `RawExtraction` | 12 SPARQL queries: TBox structure, SHACL shapes (incl. `sh:or`/`sh:in`), and ABox probes (instance counts, self-reference, functional violations, undeclared predicates, annotations). All store access happens here so passes 2–7 stay pure. |
| 2 Build | `build.ts` | `RawExtraction` → `OntologyIR` | subClassOf closure, abstract/embeddable detection from instance stats, per-class cardinality with KG.17 precedence (custom > `owl:FunctionalProperty` > `owl:cardinality` > SHACL > kind default), range resolution. |
| 3 Validate | `validate.ts` | `OntologyIR` → `OntologyIR` (+ diagnostics) | the V-series diagnostics (blank-node-only class, domainless property, asymmetric inverse, boolean-as-string, SHACL specifics, abstract-with-instances `V015`, supertype flattening `V016`). Never mutates the IR; never aborts. |
| 4 Map | `map.ts` | `OntologyIR` → `MappedIR` | GraphQL naming rules (KG.09), collision auto-resolution (namespace prefixing), synthetic inverse field synthesis, the bidirectional name map. |
| 5 Emit | `emit.ts` | `MappedIR` → `SchemaPlan` | a field plan + resolver per field (one of the eight resolver templates), because graphql-js type objects are immutable once constructed. |
| 6 WireRelay | `wireRelay.ts` | `SchemaPlan` → `SchemaPlan` | the `Node` interface (id + uri) on types *and* qualifying interfaces, cursor connections, the `node(id:)` and per-type `<type>(uri:)` / listing root fields. |
| 7 Compose | `compose.ts` | `SchemaPlan` → `GraphQLSchema` | the single construction point: builds every graphql-js type once, attaches the TBox schema and consumer extensions, runs `validateSchema`, prints the SDL. |

`runPasses.ts` threads 2→7; `compile.ts` runs `extract` then `runPasses`. Splitting construction (Pass 5/6 plan, Pass 7 build) is deliberate — graphql-js objects can't be mutated after creation, so the plan accumulates intent and compose realizes it in one shot.

## 3. The typed IRs

The intermediate representations are exported public contracts (like Prisma's DMMF), not internals — tooling can consume them.

- **`RawExtraction`** — the serializable result of Pass 1 (the twelve queries). It is the artifact boundary (§7).
- **`OntologyIR`** — the typed ontology: `ClassNode` (ancestors, subclasses, `isAbstract`, `embeddable`) and `PropertyNode` (kind, domains, resolved `RangeSpec`, per-class `CardinalitySpec`).
- **`MappedIR`** — GraphQL-shaped: `MappedType`/`MappedInterface`/`MappedField`, the `NameMap`, the namespace inventory.
- **`SchemaPlan`** — field configs + resolvers awaiting construction.

## 4. The OWL → GraphQL model

- **Naming (KG.09).** Field names strip a leading `has`/`is`; list fields are pluralized (the pluralizer knows the irregulars). Illegal GraphQL names are sanitized; collisions are auto-resolved by namespace prefixing (diagnostic `M004`) or, if unresolvable, reported as `M001`.
- **Cardinality (KG.17).** A property is singular when a custom mapping says so, else if `owl:FunctionalProperty`, else SHACL `maxCount 1`, else the kind default (datatype → singular, object → list). List items are always non-null (`[T!]!`).
- **Embeddable types (KG.13).** A class whose instances are exclusively blank nodes has no URI, so no global ID, no cursor, no standalone resolution. It is emitted without `Node`/`id`/`_meta`, as a plain `[T!]!` list, and resolved inline from the parent's own triples — fetched in the parent's CONSTRUCT closure (a per-blank follow-up query is invalid SPARQL: blank-node labels are existential and not stable across result sets).
- **Interfaces & abstract classes (KG.08).** A class with subclasses and *no direct instances* is abstract → an `interface`. If all of its concrete implementors are non-embeddable it implements `Node`, so a fragment written against the interface is Relay-refetchable. A class that is concrete *and* has subclasses stays a concrete type and earns `V016` (its supertype-typed fields flatten polymorphism); the interface-plus-companion alternative is deferred (ADR §13, DEF.01).
- **Inverse pairs (KG.02).** `owl:inverseOf` produces one field per side, never the four-way duplication. At resolution each side takes the **union of forward and reverse assertions**, so data asserted in either direction answers identically from both ends. Synthetic inverses (a reverse field with no declared partner) are minted in Pass 4.
- **Global IDs (KG.10).** The Relay `id` is the prefixed URI (`lib:dune`), not an opaque token — usable in GraphiQL, URLs, and the CLI. `toPrefixed` chooses the longest matching namespace so IDs are canonical and order-independent.
- **Self-description (KG.03).** Every non-embeddable type carries `_meta: EntityMeta!`, exposing the class definition and per-field `ClassProperty` metadata (required/singular/inherited) read from the frozen IR.

## 5. Runtime model

- **The ke plugin (`createSchemaPlugin`).** Registered with `createStore`, it compiles on `onReady` and recompiles on `onReload`, exposing `{ schema, createContext, diagnostics, nameMap, sdl, clearLoaderCache }` under `store.api("ke-graphql")`. `onLoad` fingerprints the sources for artifact freshness.
- **Resolution & DataLoader (KG.04).** A `CompilerContext` carries three batched loaders — entity (one CONSTRUCT with a `VALUES` clause + blank-node closure), list (one SELECT per class, name-sorted), inverse (one SELECT over reverse assertions). The eight resolver templates in `resolver/templates.ts` read the parent `EntityValue`'s `TripleSet` and dispatch to these loaders.
- **Lazy store.** The context accepts `Store | Promise<Store>`; ABox loaders `await` it at query time, TBox resolvers never touch it. This lets the schema be ready before the store finishes loading.
- **Local execution (KG.20).** `executeLocal` runs an operation in-process (SSR, tests, scripts) — `graphql()` for plain documents, `experimentalExecuteIncrementally` when the schema or document involves `@defer`/`@stream`. Path B (`extractStatic`) runs a fixed query set for fully static deployments.
- **Incremental delivery (KG.21).** `graphql@17.0.0-rc.0`; the `incremental` compile option adds `@defer`/`@stream`; `relayFormatAdapter` translates v17's 2023 payload format to Relay's legacy `path`/`label`/`is_final` shape. A drain-and-merge fallback (`mergeIncremental`) means a format break can cost streaming, never correctness.

## 6. Package boundary (KG.22)

The root export is **schema + resolvers + local execution only** (`graphql` + `dataloader`). The fetch handler and GraphiQL live behind the **`@canonical/ke-graphql/http`** subpath (`createGraphQLHandler`, `graphiqlHtml`), mirroring `@canonical/ke/http`, so SSR/static/test consumers load no HTTP code. The handler is a plain `(Request) => Promise<Response>` — GraphQL-over-HTTP, CORS, persisted queries, multipart incremental — composing like any fetch handler.

## 7. Performance model (KG.23)

- **Extraction artifact** (DMMF pattern). `pragma graphql build` serializes Pass 1 to JSON with an FNV-1a `sourcesHash`. `compileFromExtraction` boots the schema from it without touching the store (~9 ms vs ~54 ms live), falling back to a live compile when the hash is stale.
- **Store-free TBox.** `_meta`/Ontology/Class resolvers read the frozen IR; they answer even after the store is disposed (~0.13 ms).
- **Slice-before-hydrate.** Every connection — root *and* nested — paginates the URI window first and hydrates only the page (24 entities, not 250).
- **Loader caches.** `loaderCache: "request"` (default, per-request isolation) or `"process"` (shared across requests; sound because the store is immutable between reloads). Process caches are bounded LRUs (`processCacheSize`).

The ladder: a warm process answers in microseconds; an artifact boot is ~80 ms per cold container; Cloudflare Workers (WASM precompiled, TTL as inline sources) cold-start in tens of ms; persisted queries behind a CDN make responses pure functions of *(hash, variables)*; `extractStatic` removes the runtime entirely.

## 8. Hardening

The `src/lib/hardening/` domain is the production-safety posture in one named place — tunable, exported, never magic numbers in a resolver:

- `isSafeIri` — drops IRIs that would break out of a SPARQL `IRIREF`, so a crafted `node(id:)` resolves to null, not injected SPARQL (ke queries are read-only, but the guard closes cross-graph disclosure and cost amplification).
- `clampConnectionArgs` (+ `DEFAULT_PAGE_SIZE`/`MAX_PAGE_SIZE`) — no connection is unbounded and no client can demand an oversized page; applied at both pagination choke points.
- `createDepthLimitRule` (+ `DEFAULT_MAX_QUERY_DEPTH`) — bounds the recursion cyclic types allow.
- `createBoundedCache` (+ `DEFAULT_PROCESS_CACHE_SIZE`) — the bounded LRU behind `"process"` mode.
- `maskError` — replaces internal/unexpected error messages with a generic one in production; deliberate validation/argument errors pass through.

The HTTP handler also defaults introspection and field-suggestions off in production (`process.env.NODE_ENV`, or always-on hardening where `process` is absent, e.g. Workers).

## 9. Diagnostics

The compiler collects problems instead of aborting (the `tsc` model). Codes are stable: `E001` (extraction), `B001–B004` (build references), `V001–V016` (data/ontology validation), `M001–M004` (naming), `X002–X003` (union emission), `C001–C003` (composition). **Only composition errors (`C00x`) prevent schema creation** — `compile()` then throws `CompilationError` with the full list. Everything else surfaces in `result.diagnostics` while the schema still builds; the consumer chooses its failure policy (`pragma graphql check` fails CI on any error-severity diagnostic).

## 10. Delivery

This package is being landed as a stack of focused PRs; the decomposition and dependency order are recorded in `A.10.COMPILER` §14.
