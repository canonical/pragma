# @canonical/ke-graphql

OWL → GraphQL compiler for the [ke](../ke) triple store. Reads the OWL TBox
(classes, properties, domains/ranges, `subClassOf`, cardinality, SHACL shapes)
at store start and compiles a `GraphQLSchema` — types, interfaces, unions,
field resolvers, DataLoaders, and Relay server conventions — through a
seven-pass pipeline with a typed intermediate representation.

Architecture decision record: `A.10.COMPILER` (pragma-adrs, session/A).

## Design

| Pass | Module | In → Out |
|---|---|---|
| 1 Extract | `compiler/extract.ts` | ke store → `RawExtraction` (12 SPARQL queries: TBox + SHACL incl. `sh:or`/`sh:in` + ABox probes) |
| 2 Build | `compiler/build.ts` | `RawExtraction` → `OntologyIR` (closure, abstract/embeddable detection, per-class cardinality) |
| 3 Validate | `compiler/validate.ts` | diagnostics V001–V014, no mutation |
| 4 Map | `compiler/map.ts` | `OntologyIR` → `MappedIR` (names, collisions, templates, synthetic inverses) |
| 5 Emit | `compiler/emit.ts` | `MappedIR` → `SchemaPlan` (field plans + resolvers) |
| 6 Wire Relay | `compiler/relay.ts` | Node/id/uri/_meta, connections + args, root queries |
| 7 Compose | `compiler/compose.ts` | plans + TBox + extensions → `GraphQLSchema` (single construction point) |

Passes 2–7 are pure; only Pass 1 touches the store. The compiler never aborts
on the first problem — diagnostics carry stable codes (tsc model), and only
composition errors prevent schema creation.

## Usage

```ts
import { createStore } from "@canonical/ke";
import { createSchemaPlugin, type SchemaPluginApi } from "@canonical/ke-graphql";
import { createGraphQLHandler } from "@canonical/ke-graphql/http";

const graphql = createSchemaPlugin({
  mappings: { "ds:hasModifier": { graphqlName: "modifiers" } },
});

const store = await createStore({
  sources: ["./ontology.ttl", "./data/**/*.ttl"],
  prefixes: { ds: "https://ds.canonical.com/" }, // drives namespace discovery + global IDs
  plugins: [graphql],
});

const { schema, sdl, createContext } = store.api<SchemaPluginApi>("ke-graphql")!;

// Serve (the handler lives in the /http subpath — the root export is
// schema + resolvers only, no server code):
Bun.serve({
  fetch: createGraphQLHandler(schema, {
    graphiql: true,
    context: () => createContext(store),
  }),
});

// Or execute locally — no server, no HTTP (SSR, build-time extraction):
import { executeLocal } from "@canonical/ke-graphql";
const result = await executeLocal({
  schema,
  source: `{ components(first: 10) { edges { node { name } } } }`,
  contextValue: createContext(store),
});
```

## Package boundary

- **`@canonical/ke-graphql`** — compiler, plugin, resolvers, local execution
  (`executeLocal`, `mergeIncremental`, `relayFormatAdapter`, `extractStatic`).
  Dependencies: `graphql` (v17, pinned), `dataloader`.
- **`@canonical/ke-graphql/http`** — fetch-compatible handler
  (`(Request) => Promise<Response>`) with GraphiQL, validation-rule /
  persisted-query / introspection seams, and multipart incremental delivery
  (`@defer`/`@stream`). Mirrors `@canonical/ke/http`.

## Conventions produced

- Relay global ID = the entity's prefixed URI (`ds:global.component.button`)
- Every superclass chain becomes a GraphQL interface chain; interfaces
  implement `Node` when all their concrete implementors do
- Blank-node-only classes are *embeddable*: no `Node`, no `id`, plain lists,
  resolved inline from the parent's triples
- Every non-embeddable type carries `_meta: EntityMeta!` (its TBox class,
  per-class required/singular field metadata)
- Singular fields are nullable; lists/connections are non-null with empty
  defaults; `id`/`uri` are non-null
