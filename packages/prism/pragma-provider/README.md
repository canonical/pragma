# @canonical/prism-pragma-provider

**The pragma provider for the Prism docsite contract.** It reads pragma's Turtle
corpus, compiles it with [`@canonical/ke-graphql`](../../runtime/ke-graphql) into an
executable GraphQL schema, and serves it as a fetch-native handler.

It exists because the docsite app should not. Until this package landed,
`apps/react/pragma-docs/src/server/graphql.ts` held the ref-package list, the semantic
package list, an ontology exclusion, a custom field mapping, and the compiler options —
296 lines of knowledge about *pragma's specific ontologies* living inside an application
that claims to render against any conformant provider. After this package, the app
imports one factory and depends on **no knowledge engine at all**: no `@canonical/ke`,
no `@canonical/ke-graphql`.

> **Deliberately not published.** `"private": true`, matching
> [`prism-graph-example`](../graph-example). Its only consumer is this repository.

---

## Why it *does* use ke-graphql

This is the exact inverse of [`prism-graph-example`](../graph-example), and the
inversion is the point.

graph-example is hand-written **because** it must not use ke-graphql: one compiler
satisfying the contract twice measures the compiler, not the contract. That package is
the control.

This package is the subject. It is what the docsite actually runs on, and ke-graphql
*is* the thing under test here — whether the compiler, pointed at real ontologies with
real modelling accidents in them, emits a schema that satisfies the same contract a
hand-written provider does. Two providers, two engines, one contract. Neither package
proves anything without the other.

---

## The four pieces of relocated pragma knowledge

Each of these is a fact about a specific upstream ontology, and each has a fix that
would delete it from this repo. They are pinned constants
(`src/lib/config/constants.ts`), not options — see that file's header for why.

| Constant | What it encodes | The upstream fix that deletes it |
|---|---|---|
| `REF_PACKAGES` | `design-system`, `code-standards`, `anatomy-dsl` — the cached source packages | A manifest in the refs cache the provider could read instead of hard-coding |
| `SEM_PACKAGES` | `surface`, `design-system-docs` — the docsite's own demand model, in a second root | Publishing the demand model as a ref package, collapsing two roots to one |
| `EXCLUDED_SOURCES` | drops `design-system-docs/data/shim-concept.ttl`, whose `ds:embodiesConcept rdfs:domain ds:Entity` smears two fields onto all fourteen `ds:` types | A modelling fix: narrow the domain off the class-tree root |
| `CUSTOM_MAPPINGS` | renames `anatomy:uri` → `anatomyUri`, because `uri` is the compiler-injected primary key | A `graphql:name "anatomyUri"` annotation on the term in the anatomy DSL's own repository |

### The anatomy collision is now a test, not a paragraph

`CUSTOM_MAPPINGS` is the single most load-bearing line in the package, and its
justification used to be prose in a comment that nothing checked. Two documents in this
repo disagreed about whether the failure it prevents was fatal yet.

It was settled by running it. **Measured at `4d228c8`**, over the hermetic corpus:

| | Outcome |
|---|---|
| **with** the mapping | boots; SDL carries `anatomyUri: String` on `NamedNode`; one `V014` info diagnostic |
| **without** it | **throws `CompilationError`** — `M005 … maps to NamedNode.uri, a structural field the compiler owns — the field is DROPPED` |

The fatality is live. `src/lib/provider/createPragmaProvider.test.ts` asserts it, both
halves, on every run.

---

## `mode` and `prefixing` are pinned, not defaulted

The app set neither, so it ran at ke-graphql's defaults *by accident*. This package
passes both explicitly:

```ts
mode: "annotated"   // heuristic baseline plus the graphql: annotation overlay
prefixing: "none"   // field names are the mapped OWL local names
```

`prefixing: "none"` is what makes the emitted names byte-compatible with the committed
`apps/react/pragma-docs/src/relay/schema.graphql` that relay-compiler reads.
`prefixing: "all"` — the blanket M005 remedy — would namespace-prefix **every** field in
the schema to clear one collision, invalidating every committed Relay artifact at once.
An implicit default that a dependency bump could change is exactly the kind of unstated
fact this package exists to write down.

---

## The SDL output path belongs to the caller

`PragmaProviderOptions.sdlOutput` is optional and **absent means no write**. This
package never derives a path.

The app's former `graphql.ts` derived one from `import.meta.url`. Carried into a package
unchanged, that resolves relative to the *package* — so the app's schema would be
written into `node_modules`, and `tsc`, `biome` and every test in the repo would still
pass. Only a boot reveals it, and a boot needs a refs cache. The guard is therefore
structural: there is no path in this package to get wrong.

---

## Testing: the hermetic corpus

Pragma's real corpus is the pragma CLI's refs cache plus a semantics working tree.
Neither exists in CI or in a fresh clone, so a suite that needed them would be skipped —
and a skipped gate is worse than no gate.

`src/__fixtures__/corpus/` is a hand-written Turtle corpus in the exact shape the
collector walks, small enough to read in one sitting and complete enough to make every
property falsifiable: two roots merging, dot-prefixed files skipped, the exclusion
dropped, channel-dotted references escaped, prefixes harvested, both actionable failure
messages, and the anatomy collision in both directions. See that directory's README for
what each file is for. Precedent: `packages/runtime/ke-graphql/demo/graph.ttl`.

### The two SDL captures are stale, and it is written down

`src/__fixtures__/*.sdl.txt` back `src/testing/sourceAdditivity.test.ts` (ported
unchanged from the app). Measured at `4d228c8` against `@canonical/prism-contract`:
**12 violations each, identical set**. They predate the converged base.

They are kept because the property that suite asserts — additivity of the second source
root — is a property of the **source set**, orthogonal to the structural head, and both
sides of the comparison are equally stale. The type inventory has not drifted: the
merged capture carries 183 top-level definitions, exactly the live schema's count. They
cannot be regenerated without a full refs cache, and a capture from a *partial* cache is
worse than a stale one because it looks current.

The gap that leaves is closed by `src/testing/integration/committedSdl.test.ts`, which
measures the **current** emission against the contract on every run.

---

## Running it

```bash
bun run serve   # GraphiQL at http://127.0.0.1:5177/graphql
```

Port 5177: the docsite's own graph holds 5175 and graph-example holds 5176, so all three
run at once and the docsite can be pointed at any of them with `VITE_GRAPHQL_URL`.

**It will not boot without a populated pragma refs cache** (`pragma sources update`, or
`PRAGMA_REFS_DIR`). That is correct: `collectTtlSources` throws with the remedy in the
message before an Oxigraph store is ever created. A demo that fabricated a graph to have
something to serve would be demonstrating something other than this provider.
