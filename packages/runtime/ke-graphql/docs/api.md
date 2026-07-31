# API reference — `@canonical/ke-graphql`

Two entry points:

- **`@canonical/ke-graphql`** — compiler, schema, resolvers, local execution (no HTTP).
- **`@canonical/ke-graphql/http`** — the fetch handler and GraphiQL.

Exhaustive types ship in the `.d.ts`; this document is the callable surface grouped by domain. See `docs/architecture.md` for the design and rationale.

---

## Compiler

### `compile(query, prefixes, options?)`
```ts
compile(query: QueryFn, prefixes: Readonly<Record<string,string>>, options?: SchemaPluginOptions): Promise<CompilerResult>
```
Run the full pipeline (Pass 1 executes SPARQL through `query`). Throws `CompilationError` whenever the compile produces any error-severity diagnostic; warnings and infos surface in `result.diagnostics`. Most consumers use `createSchemaPlugin` instead and never call this directly.

### `compileFromExtraction(artifact, options?, { assumeValid? }?)`
```ts
compileFromExtraction(artifact: string | SerializedExtraction, options?: SchemaPluginOptions, opts?: { assumeValid?: boolean }): CompilerResult
```
Boot the schema from a precomputed extraction **without touching the store** (passes 2–7 only). `assumeValid` (default `true`) also skips `validateSchema`/SDL printing. Pair with `hashSources` to check freshness.

### `createSchemaPlugin(options?)`
```ts
createSchemaPlugin(options?: SchemaPluginOptions & SchemaPluginExtra): Plugin<SchemaPluginApi>
```
The ke plugin. Compiles on `onReady`, recompiles on `onReload`, registers `SchemaPluginApi` under `"ke-graphql"`. `SchemaPluginExtra.extraction` boots from an artifact (path or parsed) when its `sourcesHash` matches the loaded TTL.

```ts
const graphql = createSchemaPlugin({ mappings: { "lib:authored": { graphqlName: "works" } } });
const store = await createStore({ sources, prefixes, plugins: [graphql] });
const { schema, createContext } = store.api<SchemaPluginApi>("ke-graphql")!;
```

### `createStoreQueryFn(store)`
```ts
createStoreQueryFn(store: Store): QueryFn
```
Adapt a ke `Store` to the `QueryFn` the compiler expects.

### `createContextFactory(mapped, options)`
```ts
createContextFactory(mapped: MappedIR, options: SchemaPluginOptions): ContextFactory
```
Build the per-request `CompilerContext` factory (fresh DataLoaders, or shared `"process"` caches). `factory(store)` → context; `factory.clearCache()` drops shared caches. Usually obtained as `result.createContext`.

### `CompilationError`
Thrown by `compile` when the compile produces any error-severity diagnostic (or composition yields no schema). Carries `.diagnostics: Diagnostic[]` — the full list, not only the fatal ones.

Any error-severity diagnostic refuses the compile: a schema minus silently dropped fields must never be served, so a boot dies loudly instead. Warnings and infos surface in `result.diagnostics` while the schema builds, and the consumer picks its policy for those. `DiagnosticCode` is stable and append-only: `E001`, `B001–B004`, `V001–V016`, **`M001–M006`**, `X002–X003`, `W001`, `C001–C003`. The naming band reads: `M001` duplicate type or field name (the later claimant is dropped, error), `M002` illegal class local name sanitized, `M003` mapping references nothing, `M004` type-name collision auto-resolved by namespace prefixing, `M005` property claims a structural field name — `uri` or `_meta` — and is dropped (error), `M006` one union name minted with two different member sets (the later definition is dropped, error). `W001` is the Relay-wiring band: two root query fields claiming one name (the later field is dropped, error). `M001`/`M005` name the offending IRIs and the remedies; none of them ever renames anything silently. See the README's diagnostics table for the full list.

### Result & key option shapes
- **`CompilerResult`** — `{ schema, sdl, diagnostics, nameMap, mapped, extraction, createContext, clearLoaderCache }`. `extraction` is the Pass 1 output (`RawExtraction`) — the value `serializeExtraction` turns into a boot artifact.
- **`SchemaPluginApi`** — `{ schema, diagnostics, nameMap, sdl, createContext, clearLoaderCache }` (the `store.api("ke-graphql")` surface).
- **`SchemaPluginOptions`** — `mappings` (deprecated — prefer the `graphql:` annotations; a key shadowing an annotation wins with `A005`), `extensions`, `relay`, `incremental`, `sdlOutput`, `nonNullOverrides` (deprecated — prefer `graphql:nonNull`, OR-merged), `prefixing` (`"none"`|`"all"`), `mode` (`"auto"`|`"annotated"`|`"explicit"`), `provider`, `revision`, `standardVocabFields` (deprecated), `onRuntimeWarning`, `loaderCache` (`"request"`|`"process"`), `processCacheSize`.
- **`FieldPrefixing`** — `"none"` (default) | `"all"`. `"all"` namespace-prefixes every generated field name (`lib:uri` → `libUri`). It always clears an `M005` — the structural names the compiler owns carry no prefix — but clears an `M001` only when the two colliding IRIs sit in **different** namespaces (`ex:name` + `ds:name` → `exName` + `dsName`). Same-namespace claimants take the same prefix and collide again (`ex:name` and `ex:hasName` both strip to `name`, both become `exName`), so that case still needs a `mappings` rename. An explicit `mappings[…].graphqlName` is never prefixed.
- **`ProjectionMode`** — `"auto"` | `"annotated"` (default) | `"explicit"`, stamped into the SDL provenance header. `"auto"` never consults the `graphql:` annotation overlay (broken annotations still compile; `A006` notes ignored assertions). `"annotated"` binds the overlay per term over the heuristics. `"explicit"` projects only classes annotated `graphql:expose true` — everything else is skipped with the aggregated `A007`, a field whose range class is unexposed is omitted with `A008`, and an unexposed class's TBox `instances`/`instanceCount` answer empty/0 while the browser stays complete.
- **`CustomMapping`** — `{ graphqlName?, singular?, abstract?, embeddable?, inverse?: { graphqlName } }`, keyed by IRI or prefixed name in `CustomMappings`. Deprecated as the primary transport: declare the same knobs as `graphql:` annotations on the ontology terms; a config key keeps working and wins per key (`A005`). The synthetic `inverse: { graphqlName }` form stays config-only.
- **`GraphqlOverlay`** — the resolved `graphql:` annotation overlay on `OntologyIR.graphql`: `classes` (`name`, `abstract`, `embeddable`, `expose`, `titleFrom`/`labelFrom`/`commentFrom`/`definitionFrom`), `properties` (`name`, `singular`, `nonNull`, `inverse`, `searchable` — IR capture only), and the validated `prefixes` map.

---

## Artifact

### `serializeExtraction(extraction, sourcesHash)` / `deserializeExtraction(artifact)`
```ts
serializeExtraction(extraction: RawExtraction, sourcesHash: string): string
deserializeExtraction(artifact: string | SerializedExtraction): { extraction: RawExtraction; sourcesHash: string }
```
Codec for the boot artifact. `deserializeExtraction` throws if `version !== ARTIFACT_VERSION`. The `graphqlAnnotations` field is optional on the wire: a pre-vocabulary artifact deserializes it as `[]` and still boots (the version stays 1 — `sourcesHash` already forces a live recompile the moment the sources gain an annotation the artifact has not seen).

### `hashSources(contents)`
```ts
hashSources(contents: Iterable<string>): string
```
FNV-1a fingerprint of the loaded TTL sources — the freshness key for `compileFromExtraction`.

### `ARTIFACT_VERSION`
The artifact format version (a number); bump invalidates old artifacts.

---

## Local execution & incremental delivery

### `executeLocal(args)`
```ts
executeLocal(args: { schema, source: string, document?: DocumentNode, variableValues?, contextValue: CompilerContext, operationName? }): Promise<LocalExecutionResult>
```
In-process execution (no HTTP). Plain documents return an `ExecutionResult`; `@defer`/`@stream` (or any incremental-capable schema) return `IncrementalResults`. Pass `document` to skip an internal parse.

### `mergeIncremental(results)` / `isIncrementalResults(result)`
Drain an `IncrementalResults` stream into one complete `{ data, errors }`; the type guard distinguishes a stream from a plain result.

### `relayFormatAdapter(results)`
```ts
relayFormatAdapter(results: IncrementalResults): AsyncGenerator<RelayLegacyPayload>
```
Translate v17 incremental payloads to Relay's legacy `path`/`label`/`is_final` shape. **`@experimental`** — coupled to the graphql v17-RC payload format.

### `extractStatic(options)`
```ts
extractStatic(options: { schema, mapped, context, queries: StaticQuery[] }): Promise<Map<string, ExecutionResult>>
```
Build-time static extraction: run a fixed query set, keyed by name (queries with a single `uri` variable run once per instance, keyed `"name:uri"`). Throws on non-enumerable variables.

### `createPersistedManifest(operations)` / `sha256Hex(text)`
```ts
createPersistedManifest(operations: Iterable<string>): Promise<Record<string,string>>
sha256Hex(text: string): Promise<string>
```
Build a `{ sha256 → query }` manifest from compiled client operations (Web Crypto; the Relay/Apollo persisted-query convention).

---

## Relay connection helpers

```ts
toConnection<T>(allItems: T[], args: ConnectionArgs, presorted?: boolean): Connection<T>
paginateUriWindow(uris: readonly string[], args: ConnectionArgs): UriPage
connectionFromPage<T>(entities: T[], page: UriPage): Connection<T>
emptyConnection<T>(): Connection<T>
toBase64(value: string): string         // cursor encode
fromBase64(value: string): string       // cursor decode (tolerant — garbage → "")
isEntity(v): v is EntityValue           // filter loadMany results
unwrapEntities(results): EntityValue[]  // rethrow batch errors, drop nulls
```
`toConnection` runs the full Relay algorithm over an in-memory list; `paginateUriWindow` + `connectionFromPage` are the slice-before-hydrate pair (paginate the URI list, hydrate only the page). All page sizes are clamped by the hardening domain.

---

## Hardening

```ts
isSafeIri(iri: string): boolean
clampConnectionArgs<T>(args: T, limits?: { defaultPageSize; maxPageSize }): T
createDepthLimitRule(maxDepth: number): (ctx: ValidationContext) => ASTVisitor   // a graphql ValidationRule
createBoundedCache<K,V>(maxSize: number): Map<K,V>                                // bounded LRU
maskError(error: GraphQLError, mask: boolean): GraphQLFormattedError
```
Constants: `DEFAULT_PAGE_SIZE` (50), `MAX_PAGE_SIZE` (100), `DEFAULT_MAX_QUERY_DEPTH` (20), `DEFAULT_PROCESS_CACHE_SIZE` (10000). See the Hardening section of `docs/architecture.md`.

---

## URI conversion

Identity inside the compiler is the absolute IRI everywhere. These two helpers serve the edges only.

```ts
toPrefixed(fullUri: string, namespaces: ReadonlyMap<string, NamespaceInfo>): string         // longest-match → "lib:dune"
toFull(prefixed: string, namespaces: ReadonlyMap<string, NamespaceInfo>): string | undefined // → full IRI, or undefined for unknown prefix
```

`toPrefixed` is a **display** helper with zero internal callers, deliberately: every place it used to be called was a place the prefixed form could drift out of sync with a cursor. `toFull` expands the singular `<type>(uri:)` lookup argument, its only caller.

```ts
isAbsoluteIri(value: string): boolean   // RFC 3986 §3.1 scheme + non-empty remainder
```

The `node(id:)` admission gate — prefix-map-free, so the same id resolves identically regardless of registered prefixes.

---

## Types

The exported IR and value types: `RawExtraction`, `OntologyIR`, `MappedIR`, `ClassNode`, `PropertyNode`, `MappedType`, `MappedInterface`, `MappedField`, `RangeSpec`, `CardinalitySpec`, `NameMap`, `NamespaceInfo`, `InstanceStats`, `EntityValue`, `TripleSet`, `TripleValue`, `Diagnostic`, `DiagnosticCode`, `DiagnosticSeverity`, `PassResult`, `QueryFn`, `ResolverTemplate`, `RuntimeWarningHandler`, `CompilerContext`, `ContextFactory`, `CompilerResult`, `SchemaPluginApi`, `SchemaPluginOptions`, `SchemaPluginExtra`, `CustomMapping`, `CustomMappings`, `NonNullOverrides`, `FieldPrefixing`, `ProjectionMode`, `SchemaExtensions`, `SchemaExtensionsInput`, `SerializedExtraction`, `Connection`, `ConnectionArgs`, `UriPage`, `IncrementalResults`, `LocalExecutionResult`, `RelayLegacyPayload`, `StaticQuery`.

---

## `@canonical/ke-graphql/http`

### `createGraphQLHandler(schema, options)`
```ts
createGraphQLHandler(schema: GraphQLSchema, options: GraphQLHandlerOptions): (request: Request) => Promise<Response>
```
A framework-free GraphQL-over-HTTP handler: GET (query param) / POST JSON, persisted-query extension, CORS preflight, `Accept` q-values, multipart incremental delivery.

**`GraphQLHandlerOptions`** (every policy seam + the built-in hardening defaults):
`context` (required, per-request `CompilerContext`), `graphiql`, `cors`, `maxQueryLength`, `maxDepth` (default `DEFAULT_MAX_QUERY_DEPTH`, 0 disables), `validationRules`, `introspection`, `persistedQueries` (`{ get, allowArbitraryQueries? }`), `hideFieldSuggestions`, `formatError`, `maskErrors` (default: production), `onOperation`, `incremental`, `incrementalFormat` (`"graphql17"`|`"relay-legacy"`), `graphiqlHtml`. Defaults are dev-vs-production aware (`NODE_ENV`; hardened where `process` is absent).

### `graphiqlHtml(endpoint)`
```ts
graphiqlHtml(endpoint: string): string
```
The default GraphiQL page (version-pinned UMD assets from unpkg). Override via `GraphQLHandlerOptions.graphiqlHtml` for air-gapped/vendored deployments.

### `OperationEvent`
The `onOperation` payload: `{ operation, duration, errors, persisted }`.
