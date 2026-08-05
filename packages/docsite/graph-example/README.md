# @canonical/prism-graph-example

A **second, hand-written implementation of [`@canonical/prism-contract`](../contract)**,
serving a fictional metro network.

It exists so that one sentence in the Prism acceptance criteria becomes runnable rather
than rhetorical:

> the lenses render against a provider that has never heard of pragma.

Everything here is built to make that measurable. If the contract were secretly shaped
around ke-graphql, or secretly required a compiler, this package is where it would show
— as awkwardness, as a field that cannot be answered, or as a line count that runs away.
Two of those three happened. They are written down below rather than smoothed over.

> **Deliberately not published.** `"private": true`. A new public package needs a manual
> first `npm publish --access public` plus human OIDC trusted-publisher setup before
> release automation works, and a reference implementation whose only consumer is this
> repository should not need that to merge. Flipping it later is a one-line change:
> drop `"private"`, add `"publishConfig": { "access": "public" }`.

---

## Why it does not use ke-graphql

ke-graphql could produce a conformant schema from a metro ontology in an afternoon. That
would prove almost nothing.

- **It would be the same engine over different data.** One compiler satisfying the
  contract twice measures the compiler, not the contract.
- **It inverts the arrow.** The compiler *derives* a schema from an ontology; the
  contract is *authored*. Conformance-by-compiler therefore degrades into shaping the
  data until the compiler happens to emit the right names — which is a test of patience,
  not of the specification.

So this provider is `buildSchema(sdl)` and plain TypeScript objects. It starts **from**
the authored contract SDL, which it reads at runtime from `@canonical/prism-contract`,
so it cannot drift from it: change the contract and this package's contract gate is red
on the next run.

### `mode` and `prefixing` do not apply here

`mode` (`"auto" | "annotated" | "explicit"`) and `prefixing` are **ke-graphql compiler**
options. They govern how the compiler derives GraphQL names from an ontology.

**This provider derives nothing.** It implements the contract's fixed, structural names —
`uri`, `_meta`, `instances`, `superclasses`. There is no naming decision to configure,
so neither knob has an equivalent here. Do not go looking for them.

---

## What a provider must add to the contract — Finding A

**`buildSchema(contractSdl)` on its own cannot serve instance data.**

The contract declares exactly one type that `implements Node`: `OntologyClass`. So a
`NodeConnection` returned by `OntologyClass.instances` can legally contain nothing but
ontology classes. There is no type an ABox entity could *be*.

Every provider therefore extends the contract SDL with its own concrete `Node`
implementers. That extension is precisely what the contract's superset rule exists for:

```ts
const sdl = readContractSdl() + readExtensionSdl();   // src/lib/provider/providerSdl.ts
```

`schema/extension.graphql` adds `Line`, `Station`, `Interchange`, `Zone` and the
embeddable `GeoPoint`. `findBreakingChanges(contractOnly, extended)` returns zero, and
`satisfiesContract(readProviderSdl())` returns **zero violations**.

**Note what the extension does *not* contain: `extend type Query`.** Every type this
provider declares is reachable through the contract's own five root fields — `node(id:)`
and `OntologyClass.instances`. Adding provider root fields would have been easier and
would have demonstrated less.

---

## The dataset

A small fictional **metro/transit network**, in `src/lib/provider/dataset.ts`.

The subject matter is load-bearing. pragma's own graph is design systems, components,
code standards, jobs, personas, surfaces and layouts. A transit network shares **no**
vocabulary with any of it, so nothing here can be mistaken for a pragma fixture that
happens to have been renamed. (Biology and taxonomy were deliberately avoided: a domain
with its own taxonomic ranks blurs the line between the subject's hierarchy and RDFS
subclassing, and this dataset needs that line sharp.)

The file contains **inert records only** — no functions, no getters. All view
construction lives in `createExampleProvider.ts`, which keeps "a provider is some code
and a data file" literally true.

| What is in it | Which contract obligation it discharges |
| --- | --- |
| `metro:Stop` (abstract) → `metro:Station` → `metro:Interchange` | `superclass`, `superclasses` (transitive), `subclasses`, `isAbstract` |
| `metro:Line`, a second root class | `superclass: null` |
| a second ontology `geo:` with no label | `Query.ontologies` > 1, `Ontology.label` nullability |
| `rdfs:Class`, the metaclass | `EntityMeta.type` on an `OntologyClass` — see Finding B |
| `geo:Zone` with real instances, in the **second** namespace | `_meta.curie` must resolve a prefix per entity, not hardcode one |
| `metro:name` (DATATYPE, no domain), `metro:servesLine` (OBJECT, with `inverse`), `metro:note` (ANNOTATION) | all three `PropertyKind` values, `functional`, `inverse`, nullable `domain` |
| 14 stations + 2 interchanges + 2 fare zones | `instances(first/after/last/before)` with real `hasNextPage` |
| `metro:ghost` — **no descriptive predicates at all** | the local-name tier of `_meta.title` |
| `https://metro.example/onto#` — **IRI with an empty local name** | the whole-IRI tier of `_meta.title` |
| `geo:GeoPoint`, an embeddable with no `uri` | the typename tier of `_meta.title` |
| a station labelled `{"": "Northgate", "fr": "Porte-Nord"}` | `title(lang:)` / `label(lang:)` are genuinely implemented, not accepted and ignored |
| instance IRIs that live **inside** the declared namespaces | `_meta.curie` can compact at all — see the curie section |

The embeddable is **not required by the contract** — nothing in the contract references a
non-Node value type. It is here to reach `_meta.title`'s last tier and to show that a
provider may add value types freely.

---

## `_meta.title` by hand — the verdict

`title(lang: String = "en"): String!` is **non-null**, so every provider owes a total
fallback chain. The ticket suspected this would be the awkward part. It is not.

The whole of it, in `src/lib/provider/descriptive.ts`:

1. the asserted label for the requested language, else the untagged literal
2. else any asserted literal in any language
3. else the IRI's local name
4. else the whole IRI
5. else the GraphQL typename (reachable only for something with no IRI — an embeddable)

**Verdict: writing it by hand was trivial, not awkward — eight lines of body, and a point
in the base's favour.** Two honest caveats:

- It is trivial *partly because* this provider chose a shape (a language → string map)
  that mirrors RDF literals. A provider whose records have a plain `name: string` writes
  `name ?? localName(uri)` and is done in two lines. Either way `title`'s totality costs
  nothing worth arguing about.
- What is genuinely expensive is not `title`. It is `type` and `fields` — see Finding B.
  The easy win here should not be allowed to obscure that.

The gate for this (`src/testing/integration/titleTotality.test.ts`) is driven **from the
dataset**, never from a hand-listed set of URIs: every entity, every class, and every
embeddable is checked, including in a language nobody wrote.

---

## Finding B — the contract makes a TBox mandatory

`EntityMeta.type: OntologyClass!` and `EntityMeta.fields: [ClassProperty!]!` are
**non-null**. A provider whose data is a flat list of records therefore **cannot be
conformant without inventing an ontology**.

This is the single largest cost the contract imposes on a hand-written provider, and it
is the honest answer to "is the base implementable without the compiler": yes — but only
if you are willing to author a TBox alongside your data.

It is arguably the correct design; self-description is the contract's whole premise. But
it is a *consequence*, and it should be stated rather than discovered. Measured cost, in
`createExampleProvider.ts`:

| Region | Code lines |
| --- | --- |
| TBox views and traversal (`ancestorsOf`, `fieldsOf`, `propertyView`, `classPropertyView`, `classView`, `nullableClassView`, `superclassOf`) | **94** |
| the `_meta` wrapper itself (`metaView`) | **17** |
| **total attributable to the non-null TBox** | **111** |
| everything else in the function body (entities, connections, ontologies, root fields) | 122 |

Nearly half the provider is TBox machinery that exists only because those two fields are
non-null. A `type: OntologyClass` (nullable) and `fields: [ClassProperty!]` (nullable)
would let a flat-record provider conform in roughly half the code.

One side effect worth naming: because `OntologyClass` itself implements `Node`, a class
needs a class. This dataset declares `rdfs:Class` for that, which is an instance of
itself — so the tower terminates honestly rather than by fiat.

---

## Finding C — `_meta.field(name:)` had no defined key. **The contract closed it.**

Building this provider surfaced a real hole. `_meta.fields` returned `[ClassProperty!]!`,
and neither `ClassProperty` nor `OntologyProperty` exposed anything called `name` — so a
client that enumerated `_meta.fields` **could not derive a legal argument for
`_meta.field(name:)`**. The argument round-tripped through nothing. It worked in
ke-graphql only because there `name` means "the GraphQL field name the compiler derived",
a *compiler* concept leaking into a surface that claims to be provider-neutral.

**`ClassProperty` now carries `name: String!`.** The argument round-trips properly:
enumerate `_meta.fields`, read `name`, pass it straight back to `field(name:)`.

### What this provider puts in `name`, and why it has to say so

The contract can require the field but cannot say what a *hand-written* provider should
put in it — "the name the compiler derived" means nothing where nothing is derived. So
each provider states its own rule. **This one serves the property IRI's local name:**

| `property.uri` | `name` |
| --- | --- |
| `https://metro.example/onto#platformCount` | `platformCount` |
| `https://geo.example/onto#inZone` | `inZone` |

`_meta.field(name:)` matches **that exact value and nothing else** — passing the full IRI
returns null. Accepting extra aliases would make "the value `fields` publishes" stop
being the whole answer, which is the property worth having.

The one caveat: local names are not globally unique, so two properties from different
namespaces with the same local name would collide on one class. This dataset has none;
a provider whose ontology does should serve the curie (`geo:inZone`) instead — which the
contract now makes derivable, since `_meta.curie` and `Query.ontologies` are both public.

---

## `_meta.curie` by hand — the second verdict

`curie: String!` is the compact display form of the entity's IRI: `metro:northgate` for
`https://metro.example/onto#northgate`. Like `title`, it is **non-null**, so it is a
totality obligation.

**Verdict: not awkward — eight lines — but only because the dataset was honest about its
namespaces.** The implementation is:

> the declared prefix of the **longest** namespace the IRI starts with, plus the
> remainder; the whole IRI if nothing matches.

Three things are worth reporting:

1. **It resolves against `dataset.ontologies` — the very prefix/namespace pairs
   `Query.ontologies` publishes.** So a client can derive exactly the same string itself;
   the field is a convenience, never a secret. There is a test that does precisely that
   derivation and asserts it matches. A `curie` computed from anything a client cannot
   see would be a much worse field.
2. **Longest-match matters.** First-match would let a namespace shadow a longer one that
   extends it. That is two words of code, but getting it wrong is silent.
3. **It forced a real dataset change, and that is the interesting part.** Instance IRIs
   originally lived at `https://metro.example/stop/…` while the ontology lived at
   `https://metro.example/onto#…`. That is normal RDF practice, but it means **instances
   are in no declared namespace** and every curie would have degraded to the full IRI.
   Serving `curie` well is therefore a constraint on how a provider *names its data*, not
   just on how it answers a field. Instances moved into the declared namespaces, and a
   `geo:Zone` class with real instances was added so that entities genuinely span two
   prefixes — otherwise an implementation that hardcoded `metro:` would have passed every
   test. The totality gate asserts that more than one prefix appears across the dataset.

Edge cases, all gated: an IRI whose local name is empty compacts to a bare `metro:`; the
embeddable, having no IRI of its own, compacts its **class** (`geo:GeoPoint`) rather than
falling back to a bare typename, so the value stays curie-shaped.

> **Naming note:** the contract did not yet declare this field when this provider was
> written, so the name `curie` was chosen here. If the contract lands it under another
> name, this provider must follow — see the transitional shim below.

---

## A transitional shim, and its expiry date

`ClassProperty.name` and `EntityMeta.curie` are landing in the contract in a parallel PR.
Until they do, `providerSdl.ts` appends them itself:

```graphql
extend type ClassProperty { name: String! }
extend type EntityMeta    { curie: String! }
```

It does this **conditionally**, by inspecting the contract text at runtime: a provider may
be ahead of the contract (the superset rule allows any extra field) but must not declare a
field twice, which a static `extend` would do the moment the contract PR lands. So the
schema builds correctly before *and* after, with no coordinated release.

**`forwardCompatibleExtensions()` is ~33 code lines that delete cleanly once both fields
are in the contract.** It is counted in the size table below; subtract it for the
steady-state figure.

---

## Size — measured, not estimated

The ticket's premise was "a provider is ~150–200 lines and a data file". Here is what it
actually took. Code lines exclude blank lines and comments; "with docs" is the physical
file length in this repo's TSDoc-heavy house style.

| Module set | Code | With docs |
| --- | --- | --- |
| `createExampleProvider.ts` | 291 | 412 |
| `connection.ts` (Relay paging) | 47 | 90 |
| `providerSdl.ts` (SDL loading + the transitional shim) | 66 | 123 |
| `descriptive.ts` (**the whole `_meta.title` chain**) | **26** | 54 |
| barrels | 10 | 10 |
| **provider runtime total** | **440** | **689** |
| — of which the shim that deletes when the contract lands | −33 | |
| **steady-state provider runtime** | **407** | |
| `dataset.ts` (the data file — inert records) | 372 | 446 |
| `types.ts` + `constants.ts` (declarations only) | 71 | 153 |
| HTTP server (`createExampleHandler` + GraphiQL) | 95 | 140 |
| `schema/extension.graphql` | 82 | 88 |
| tests + test infrastructure | 1812 | 2115 |

**440 code lines against a 150–200 target — roughly 2.2×**, or 407 once the shim expires.
Where it goes, and which parts are anybody's fault:

1. **The contract declares 54 fields** across `Node`, `EntityMeta`, `PageInfo`,
   `NodeConnection`, `NodeEdge`, `Ontology`, `OntologyClass`, `ClassProperty`,
   `OntologyProperty` and `Query` (52 before `ClassProperty.name` and `EntityMeta.curie`).
   A provider must answer every one. At the ~4.5 lines per field this implementation
   averages, **the 150–200 target was unreachable before a line was written** — it appears
   to have been set without counting the contract's surface. That is the main correction
   to the original estimate, and it means the target should be restated as a function of
   the contract's size rather than as a constant.
2. **The mandatory TBox (Finding B) is 111 of those lines** — 95 of TBox views and
   traversal plus the 16-line `_meta` wrapper, out of a 245-line function body. This is
   the one number that is genuinely evidence *about the converged base*, and the only one
   a contract change could meaningfully reduce.
3. **Relay paging is 47 lines and is not the base's fault.** `first/after/last/before` on
   `OntologyClass.instances` is Relay's cost and would be present in any
   connection-shaped specification.
4. **`_meta.title` is 26 lines including all five fallback tiers and its TSDoc**, and
   **`_meta.curie` is 8** — the two totality obligations the ticket most suspected both
   came out cheap. The expensive obligation was the one nobody flagged: the non-null TBox.
5. **The two new fields cost ~12 lines of permanent code between them** (`curieOf` 8,
   `ClassProperty.name` 1, `_meta.curie` 1, the `inZone` relation 3). Adding fields to
   this contract is cheap for providers; it is the *non-null* ones that carry structure
   behind them that are not.

---

## Running it

```bash
bun run serve                       # http://127.0.0.1:5176/graphql, with GraphiQL
NODE_ENV=production bun run serve   # no GraphiQL, no CORS
```

Port 5176 so it never collides with the docsite's own graph on 5175 — the point is to run
both and see the same lenses render against either.

```bash
bun run check   # biome + tsc --noEmit + webarchitect
bun run test    # vitest with 100% coverage thresholds
```

The HTTP handler is ~70 lines and is **deliberately not** ke-graphql's
`createGraphQLHandler`: that one is 505 lines and imports the other graphql major pinned
in this repo, so reusing it would put two graphql instances in one process — and it would
contradict the premise that this contract is implementable without pragma's machinery.

---

## The lens gate is expected to be RED

`src/testing/integration/lensOperations.test.ts` harvests **every** query operation
declared under `apps/react/pragma-docs/src/domains/lenses/**` — at run time, from the
committed Relay artifacts, never from a snapshot — and executes each one against this
provider.

It currently **fails**, and that failure is the deliverable. The docsite's lens
operations are still written against the pre-contract schema, so no contract-conformant
provider can serve them. The test's output names each operation and each error, which is
exactly the remaining despecialisation work.

**Do not make it green by narrowing the operation set, marking it `it.fails`, adding
`skipIf`, or gating it behind an env var.** Every one of those converts a real signal into
a silent one, and the operation set must stay directory-derived so a new lens is covered
the day it lands. The gate also asserts it discovered a non-zero number of operations, so
it cannot pass vacuously if the app moves.

This gate's natural long-term home is the app, which owns the lenses. It lives here only
because the app could not take a dependency on this package while both were being written.
