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
Run the full pipeline (Pass 1 executes SPARQL through `query`). Throws `CompilationError` only on composition failure; all other problems surface in `result.diagnostics`. Most consumers use `createSchemaPlugin` instead and never call this directly.

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

### `storeQueryFn(store)`
```ts
storeQueryFn(store: Store): QueryFn
```
Adapt a ke `Store` to the `QueryFn` the compiler expects.

### `createContextFactory(mapped, options)`
```ts
createContextFactory(mapped: MappedIR, options: SchemaPluginOptions): ContextFactory
```
Build the per-request `CompilerContext` factory (fresh DataLoaders, or shared `"process"` caches). `factory(store)` → context; `factory.clearCache()` drops shared caches. Usually obtained as `result.createContext`.

### `CompilationError`
Thrown by `compile` when composition fails (`C00x`). Carries `.diagnostics: Diagnostic[]`.

### Result & key option shapes
- **`CompilerResult`** — `{ schema, sdl, diagnostics, nameMap, mapped, createContext, clearLoaderCache }`.
- **`SchemaPluginApi`** — `{ schema, diagnostics, nameMap, sdl, createContext, clearLoaderCache }` (the `store.api("ke-graphql")` surface).
- **`SchemaPluginOptions`** — `mappings`, `extensions`, `relay`, `incremental`, `sdlOutput`, `nonNullOverrides`, `standardVocabFields`, `onRuntimeWarning`, `loaderCache` (`"request"`|`"process"`), `processCacheSize`.
- **`CustomMapping`** — `{ graphqlName?, singular?, abstract?, embeddable?, inverse?: { graphqlName } }`, keyed by IRI or prefixed name in `CustomMappings`.

---

## Artifact

### `serializeExtraction(extraction, sourcesHash)` / `deserializeExtraction(artifact)`
```ts
serializeExtraction(extraction: RawExtraction, sourcesHash: string): string
deserializeExtraction(artifact: string | SerializedExtraction): { extraction: RawExtraction; sourcesHash: string }
```
Codec for the boot artifact. `deserializeExtraction` throws if `version !== ARTIFACT_VERSION`.

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

```ts
toPrefixed(fullUri: string, namespaces: ReadonlyMap<string, NamespaceInfo>): string         // longest-match → "lib:dune"
toFull(prefixed: string, namespaces: ReadonlyMap<string, NamespaceInfo>): string | undefined // → full IRI, or undefined for unknown prefix
```

---

## Types

The exported IR and value types: `RawExtraction`, `OntologyIR`, `MappedIR`, `ClassNode`, `PropertyNode`, `MappedType`, `MappedInterface`, `MappedField`, `RangeSpec`, `CardinalitySpec`, `NameMap`, `NamespaceInfo`, `InstanceStats`, `EntityValue`, `TripleSet`, `TripleValue`, `Diagnostic`, `DiagnosticCode`, `DiagnosticSeverity`, `PassResult`, `QueryFn`, `ResolverTemplate`, `RuntimeWarningHandler`, `CompilerContext`, `ContextFactory`, `CompilerResult`, `SchemaPluginApi`, `SchemaPluginOptions`, `SchemaPluginExtra`, `CustomMapping`, `CustomMappings`, `NonNullOverrides`, `SchemaExtensions`, `SchemaExtensionsInput`, `SerializedExtraction`, `Connection`, `ConnectionArgs`, `UriPage`, `IncrementalResults`, `LocalExecutionResult`, `RelayLegacyPayload`, `StaticQuery`.

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
