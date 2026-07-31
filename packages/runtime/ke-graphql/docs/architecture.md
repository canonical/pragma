# Architecture — `@canonical/ke-graphql`

The README is the narrative introduction and `docs/api.md` is the export-by-export reference; this document explains *how the package is built and why*.

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
| 2 Build | `build.ts` | `RawExtraction` → `OntologyIR` | subClassOf closure, abstract/embeddable detection from instance stats, per-class cardinality by precedence (custom > `owl:FunctionalProperty` > `owl:cardinality` > SHACL > kind default), range resolution. |
| 3 Validate | `validate.ts` | `OntologyIR` → `OntologyIR` (+ diagnostics) | the V-series diagnostics (blank-node-only class, domainless property, asymmetric inverse, boolean-as-string, SHACL specifics, abstract-with-instances `V015`, supertype flattening `V016`). Never mutates the IR; never aborts. |
| 4 Map | `map.ts` | `OntologyIR` → `MappedIR` | GraphQL naming rules, collision auto-resolution (namespace prefixing), synthetic inverse field synthesis, the bidirectional name map. |
| 5 Emit | `emit.ts` | `MappedIR` → `SchemaPlan` | a field plan + resolver per field (one of the eight resolver templates), because graphql-js type objects are immutable once constructed. |
| 6 WireRelay | `wireRelay.ts` | `SchemaPlan` → `SchemaPlan` | the `Node` interface (`uri` + `_meta`) on types *and* qualifying interfaces, `_meta` alone on embeddables, cursor connections, the `node(id:)` and per-type `<type>(uri:)` / listing root fields. |
| 7 Compose | `compose.ts` | `SchemaPlan` → `GraphQLSchema` | the single construction point: builds every graphql-js type once, attaches the TBox schema and consumer extensions, runs `validateSchema`, prints the SDL. |

`runPasses.ts` threads 2→7; `compile.ts` runs `extract` then `runPasses`. Splitting construction (Pass 5/6 plan, Pass 7 build) is deliberate — graphql-js objects can't be mutated after creation, so the plan accumulates intent and compose realizes it in one shot.

## 3. The typed IRs

The intermediate representations are exported public contracts (like Prisma's DMMF), not internals — tooling can consume them.

- **`RawExtraction`** — the serializable result of Pass 1 (the twelve queries). It is the artifact boundary (see the performance model below).
- **`OntologyIR`** — the typed ontology: `ClassNode` (ancestors, subclasses, `isAbstract`, `embeddable`) and `PropertyNode` (kind, domains, resolved `RangeSpec`, per-class `CardinalitySpec`).
- **`MappedIR`** — GraphQL-shaped: `MappedType`/`MappedInterface`/`MappedField`, the `NameMap`, the namespace inventory.
- **`SchemaPlan`** — field configs + resolvers awaiting construction.

## 4. The OWL → GraphQL model

- **Naming.** Field names strip a leading `has`/`is`; list fields are pluralized (the pluralizer knows the irregulars). Illegal class local names are sanitized (`M002`); TYPE-name collisions are auto-resolved by namespace prefixing (`M004`) or, if unresolvable, reported as `M001`. FIELD names are never silently renamed: the compiler owns exactly `uri` and `_meta`, and a property claiming one is dropped with an error-severity `M005` naming the IRI and both remedies (a `mappings` rename, or `prefixing: "all"` to namespace-prefix every field at once). A duplicate field name drops the second property with `M001` naming both IRIs. The reason is the merge in Pass 6: `new Map([...structural, ...generated])` keeps a duplicate key's first POSITION but its last VALUE, so a same-named ontology field would replace the structural `uri` and break the `Node` interface at `validateSchema` — with no diagnostic pointing at the cause.
- **Cardinality.** A property is singular when a custom mapping says so, else if `owl:FunctionalProperty`, else SHACL `maxCount 1`, else the kind default (datatype → singular, object → list). List items are always non-null (`[T!]!`).
- **Embeddable types.** A class whose instances are exclusively blank nodes has no IRI, so no cursor and no standalone resolution. It is emitted without `Node` and without `uri`, as a plain `[T!]!` list, and resolved inline from the parent's own triples — fetched in the parent's CONSTRUCT closure (a per-blank follow-up query is invalid SPARQL: blank-node labels are existential and not stable across result sets). It DOES carry `_meta`: self-description is a fact about the class, not about identity, and without it a class with zero properties of its own would emit a fieldless type and fail `validateSchema` with `C003`.
- **Interfaces & abstract classes.** A class with subclasses and *no direct instances* is abstract → an `interface`. If all of its concrete implementors are non-embeddable it implements `Node`, so a fragment written against the interface is Relay-refetchable. A class that is concrete *and* has subclasses stays a concrete type and earns `V016` (its supertype-typed fields flatten polymorphism); the interface-plus-companion alternative is a deferred option.
- **Inverse pairs.** `owl:inverseOf` produces one field per side, never the four-way duplication. At resolution each side takes the **union of forward and reverse assertions**, so data asserted in either direction answers identically from both ends. Synthetic inverses (a reverse field with no declared partner) are minted in Pass 4.
- **Identity.** One currency: the absolute IRI. `EntityValue.uri`, `Node.uri` (`ID!`), the `node(id:)` argument, the loader keys, the SPARQL terms, the listing windows, and the base64 cursors derived from them are all the same string, so an `after:` cursor cannot quietly fail to match. `node(id:)` admits an id only if it parses as an RFC 3986 absolute IRI (`hardening/isAbsoluteIri.ts`, mirroring sem's `parse_absolute_iri`) — no prefix map is consulted, so the same id resolves identically no matter which prefixes a consumer registered. The prefixed form survives in exactly two places: the singular `<type>(uri:)` lookup ARGUMENT (still `String!`, expanded by `toFull` — promoting it to `ID!` would reject every client query declaring `$uri: String!`), and `toPrefixed`, a display helper with deliberately zero internal callers.
- **Self-description.** EVERY generated type carries `_meta: EntityMeta!`, exposing the class definition and per-field `ClassProperty` metadata (required/singular/inherited) read from the frozen IR — plus the generic descriptive fields `title`/`label`/`comment`/`definition`, each with a `lang: String = "en"` argument. Keeping them behind `_meta` leaves the entire data surface (every field name but `uri` and `_meta`) to the ontology. `title` is TOTAL by construction — label, else any-tag literal, else the IRI local name, else the IRI — so a generic lens always has something to render. Each field resolves through a predicate chain computed ONCE per type at build time, never per node.

  `label`/`comment`/`definition` match the requested tag EXACTLY (`en` never matches `en-GB`), then fall back to UNTAGGED literals. That fallback is a **deliberate deviation** from sem's exact-tag-only `resolve_label`: every literal in this corpus is untagged, so sem's rule would null the whole thing out. An untagged plain literal asserts "no language stated", which is not the claim "stated in another language". `resolver/descriptive.ts` carries the same note in its header.

### Provenance header

Pass 7 prepends five `#` comment lines to the printed SDL, matching sem-graphql's printer form (`crates/sem-graphql/src/printer.rs`) so an SDL from either implementation diffs line-for-line against the other:

```
# ke-graphql · canonical SDL
# graphql-schema-spec: 1
# mode: annotated
# provider: unknown
# revision: 0
```

`graphql-schema-spec` is a placeholder `"1"` until the contract document is versioned. `provider` and `revision` are pure consumer-supplied provenance. `mode` (`auto` | `annotated` | `explicit`, mirroring sem's `ProjectionMode`) is **provenance-only today**: no `graphql:*` annotations exist in the extractor yet, so the compiler deliberately does not branch on it — a knob that silently changes nothing is worse than no knob. Its effect lands with the annotations work. `prefixing`, by contrast, has real behaviour now and is not part of the header.

The header is skipped on the `skipValidation` artifact-boot path, where `sdl` stays `""` by contract.

## 5. Runtime model

- **The ke plugin (`createSchemaPlugin`).** Registered with `createStore`, it compiles on `onReady` and recompiles on `onReload`, exposing `{ schema, createContext, diagnostics, nameMap, sdl, clearLoaderCache }` under `store.api("ke-graphql")`. `onLoad` fingerprints the sources for artifact freshness.
- **Resolution & DataLoader.** A `CompilerContext` carries three batched loaders — entity (one CONSTRUCT with a `VALUES` clause + blank-node closure), list (one SELECT per class, name-sorted), inverse (one SELECT over reverse assertions). The eight resolver templates in `resolver/templates.ts` read the parent `EntityValue`'s `TripleSet` and dispatch to these loaders.
- **Lazy store.** The context accepts `Store | Promise<Store>`; ABox loaders `await` it at query time, TBox resolvers never touch it. This lets the schema be ready before the store finishes loading.
- **Local execution.** `executeLocal` runs an operation in-process (SSR, tests, scripts) — `graphql()` for plain documents, `experimentalExecuteIncrementally` when the schema or document involves `@defer`/`@stream`. Path B (`extractStatic`) runs a fixed query set for fully static deployments.
- **Incremental delivery.** `graphql@17.0.0-rc.0`; the `incremental` compile option adds `@defer`/`@stream`; `relayFormatAdapter` translates v17's 2023 payload format to Relay's legacy `path`/`label`/`is_final` shape. A drain-and-merge fallback (`mergeIncremental`) means a format break can cost streaming, never correctness.

## 6. Package boundary

The root export is **schema + resolvers + local execution only** (`graphql` + `dataloader`). The fetch handler and GraphiQL live behind the **`@canonical/ke-graphql/http`** subpath (`createGraphQLHandler`, `graphiqlHtml`), mirroring `@canonical/ke/http`, so SSR/static/test consumers load no HTTP code. The handler is a plain `(Request) => Promise<Response>` — GraphQL-over-HTTP, CORS, persisted queries, multipart incremental — composing like any fetch handler.

## 7. Performance model

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

This package is being landed as a stack of focused PRs, decomposed in dependency order so each builds on the last.
