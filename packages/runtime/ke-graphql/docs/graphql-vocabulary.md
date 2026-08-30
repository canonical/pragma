# The `graphql:` vocabulary

The annotation vocabulary by which an ontology states its **projection intent** — how its classes
and properties should appear in the emitted GraphQL schema — without the compiler guessing and
without a consumer patching around it.

This is a **reference**. The arguments behind these rules, and the rulings that settled them, live in
`canonical/pragma-adrs` `session/B` (`B.03`, the operative ruling record); this document says what
the terms are and what they do.

```
Namespace:  https://pragma.canonical.com/graphql#
Convention: @prefix graphql: <https://pragma.canonical.com/graphql#> .
```

The namespace IRI is ratified (B.03, O-1) and keyed from a single constant, `GRAPHQL` in
`src/lib/shared/constants.ts`. Nothing else in the compiler hardcodes it.

## Stability

**The contract this vocabulary serves is at version `0.1`.** Breaking changes are accepted and there
is no backward-compatibility guarantee. Terms may change meaning, and terms listed here as *not
minted* may never be minted. What you can rely on today:

- Every term below is **validated**: a misspelled term, a wrong target, or a wrong value type
  produces a diagnostic rather than silence.
- Annotations are **inert by default in `auto` mode** and **consulted in `annotated` mode**, which is
  the default projection mode.
- **Nothing silently drops.** A collision or an unresolvable annotation is an error, and on this
  compiler an error is fatal — the compile refuses rather than emitting a schema missing a field.

## Projection modes

| Mode | Annotations | Emits |
|---|---|---|
| `auto` | **not consulted at all** | Pure OWL/SHACL inference. The escape hatch: a graph with broken annotations still compiles, reporting `A006` to say the assertions were present and ignored. |
| `annotated` *(default)* | consulted; each term overrides the inferred answer for its target | The inferred projection, corrected per-term. |
| `explicit` | consulted, **and `graphql:expose` becomes an allowlist** | Only classes carrying `graphql:expose true` appear, with their full field set. `A007` lists every class the allowlist excluded. |

`DEFAULT_MODE` is `annotated` (`src/lib/compiler/constants.ts`). Under `auto` the overlay is not
resolved, which is why an annotation error cannot break an `auto` compile.

## The terms

Thirteen terms are minted. Twelve carry a validation contract in `TERM_SPECS`
(`src/lib/compiler/annotations.ts`); `graphql:prefix` is handled separately because its target is a
namespace rather than a node.

| Term | Target | Value | Effect |
|---|---|---|---|
| `graphql:name` | class, property | string | Renames the emitted type or field |
| `graphql:expose` | class | boolean | Under `explicit`, the allowlist trigger |
| `graphql:abstract` | class | boolean | Marks the class abstract in the IR |
| `graphql:embeddable` | class | boolean | The class is a value object — no identity, no `Node` |
| `graphql:titleFrom` | class | IRI | The predicate the `title` field reads |
| `graphql:labelFrom` | class | IRI | The predicate the `label` field reads |
| `graphql:commentFrom` | class | IRI | The predicate the `comment` field reads |
| `graphql:definitionFrom` | class | IRI | The predicate the `definition` field reads |
| `graphql:nonNull` | property | boolean | Forces the field non-null |
| `graphql:singular` | property | boolean | Forces a single value rather than a list |
| `graphql:inverse` | property | IRI | Names the inverse property, pairing with `owl:inverseOf` |
| `graphql:searchable` | property | boolean | **Captured only — see below** |
| `graphql:prefix` | namespace | string | Proposes the prefix for a namespace; bound in Pass 2 |

### `graphql:name` — rename a type or a field

The most-used term, and the remedy the collision diagnostics name.

```turtle
anatomy:uri  graphql:name "anatomyUri" .
```

```graphql
type NamedNode implements Node {
  uri: ID!          # the structural key the compiler owns
  anatomyUri: String # the ontology's own property, renamed out of the way
}
```

Without the annotation, an ontology property called `uri` collides with the structural `uri: ID!`
that every `Node` carries, and the compile **refuses** (`M005`). Renaming in the ontology that owns
the term is the intended fix: the RDF is unchanged — same IRI, same domain, same range, and every
SPARQL query keeps working — only the projected field name moves.

### `graphql:expose` — the `explicit` allowlist

```turtle
ex:Film  graphql:expose true .
```

Under `mode: "explicit"`, only annotated classes are emitted, and an exposed class emits its **full**
field set — exposure is per class, not per field. `A007` reports, as `info`, every class the
allowlist left out, so the omission is visible rather than inferred from an absence.

### `graphql:embeddable` — a value object

```turtle
ex:Money  graphql:embeddable true .
```

An embeddable has no identity: it does not implement `Node`, is not refetchable, and appears only
inline in the types that reference it. A property whose range is embeddable emits the embedded shape
rather than a reference.

### `graphql:titleFrom` / `labelFrom` / `commentFrom` / `definitionFrom`

```turtle
ex:Film  graphql:titleFrom rdfs:label .
```

Each names the predicate a descriptive field reads for that class. `titleFrom` is the single
title-source annotation — there is deliberately **no operational sibling term and no precedence
pair** (B.03, R-8: *"simple, not double"*). A provider with an internal synonym maps it internally;
that is not the contract's concern.

`title` is **total**: it always returns a string. Its resolution chain is asserted label in the
requested language → any asserted label → the IRI's local name → the whole IRI, when the local name
is empty because the IRI ends in a separator → the GraphQL typename, for an embeddable, which has no
IRI at all. The last two tiers are what make it total; see B.03 R-14.

### `graphql:nonNull` and `graphql:singular`

```turtle
ex:title   graphql:nonNull true .
ex:author  graphql:singular true .
```

`nonNull` forces `String!` where inference would emit `String`. `singular` forces one value where the
default would emit a list. Both interact with SHACL: a SHACL cardinality that already implies the
same answer needs no annotation, and where both speak the precedence is
custom → `graphql:singular` → `owl:FunctionalProperty` → `owl:cardinality` → SHACL → kind default.

### `graphql:inverse`

```turtle
ex:writtenBy  graphql:inverse ex:wrote .
```

Names the inverse of a property so the emitted schema carries both directions. Joins with
`owl:inverseOf` where that is declared; the annotation is for the case where it is not.

### `graphql:searchable` — captured, not yet surfaced

```turtle
ex:title  graphql:searchable true .
```

**This term has no schema surface in this release.** It is recognised, validated, and carried into
the IR — and nothing downstream consumes it. It is documented here rather than hidden because an
author who annotates with it should know that today it changes nothing, and because an ontology with
zero `graphql:searchable` annotations is not thereby saying anything about what should be indexed.

### `graphql:prefix`

```turtle
<http://example.org/vocab#>  graphql:prefix "ex" .
```

Proposes the short prefix for a namespace. **Recorded in Pass 1 and bound in Pass 2**, because
whether a declaration replaces a serial synthetic prefix is a *mode* question, and extraction is
mode-independent by construction — one artifact serves every projection mode. A namespace that got a
synthetic prefix and carries a resolvable declaration is the one case the synthetic-prefix warning
(`E001`) cannot decide during extraction, so it is deferred.

## Diagnostics

Annotation resolution reports in the **A band**; naming and collisions report in the **M band**.

| Code | Severity | Meaning |
|---|---|---|
| `A001` | **error** | Two sources at one precedence level disagree on one term for one target. Never resolved by an alphabetical tiebreak (B.03, R-9). |
| `A002` | **error** | The term was applied to an illegal target — a class-only term on a property, or the reverse. |
| `A003` | **error** | The value has the wrong type for the term, or is empty where a value is required. |
| `A004` | warning | An unrecognised term in the `graphql:` namespace — a typo, or a term this release does not mint. |
| `A005` | warning | Workspace-local configuration shadows an upstream annotation. A deliberate asymmetry: the draft-locally workflow stays a warning where a same-level conflict is an error. |
| `A006` | info | Annotations are present but were not consulted, because the mode is `auto`. |
| `A007` | info | Under `explicit`, the classes the allowlist excluded — aggregated, one diagnostic. |
| `A008` | warning | An annotation resolved but had no effect. |
| `M001` | **error** | A naming collision the compiler cannot resolve. |
| `M002` | warning | A collision auto-resolved by namespace prefixing. |
| `M003` | warning | *(retired with the config-mapping surface it described.)* |
| `M004` | info | A generated name collided with a reserved name and was renamed. |
| `M005` | **error** | An ontology term maps onto a structural field the compiler owns — `uri`, `_meta`, or a `__`-prefixed name. The remedy is `graphql:name`. |
| `M006` | **error** | A collision that survives every automatic remedy. |
| `E001` | warning | A namespace received a serial synthetic prefix. |
| `B005` | **error** | Two namespaces claim one prefix with no declaration in play — the namespace→prefix map must be injective. |

**Errors are fatal on this compiler.** The compile refuses and a server boot exits non-zero rather
than serving a schema with silently dropped fields (B.03, R-4). That includes `B005`, which was a
warning until it was escalated: a surviving warning meant one namespace silently overwrote another
and `toFull()` resolved the shared prefix to whichever won.

## Terms considered and deliberately not minted

A vocabulary is defined as much by what it refuses. These were specified and rejected; they are not
oversights, and re-proposing one should start from the reason it lost.

| Not minted | Why |
|---|---|
| `graphql:ignore` | **One term, one direction.** `graphql:expose` already says which classes appear under `explicit`; a second term saying which disappear gives two mechanisms for one decision and a precedence question between them. |
| A field-level `graphql:expose` | Exposure is per **class**, and an exposed class emits its full field set. Per-field exposure re-introduces the question of what a partially exposed type means to a consumer holding a fragment. |
| `graphql:kind`, `graphql:implements`, `graphql:id`, `graphql:description` | Specified in the mapping vocabulary and left unbuilt behind the contract's amendment procedure. They describe surface the base contract does not yet have. |
| An operational sibling for `graphql:titleFrom` | B.03, R-8 — *"simple, not double"*. A provider's internal synonym is internal. |
| A `graphql:list` term | Inverted: the compiler emits lists by default and `graphql:singular` narrows. One term, one direction, again. |

## Where the rules live

| Concern | File |
|---|---|
| The term IRIs | `src/lib/shared/constants.ts` — `GRAPHQL_TERMS` |
| Validation contract: targets and value types | `src/lib/compiler/annotations.ts` — `TERM_SPECS` |
| Overlay resolution and the A band | `src/lib/compiler/annotations.ts` |
| Where the overlay is applied | `src/lib/compiler/build.ts` (Pass 2), `src/lib/compiler/map.ts` (Pass 4) |
| Naming, collisions, the M band | `src/lib/compiler/map.ts` |
| The rulings behind all of it | `canonical/pragma-adrs` `session/B/B.03.GRAPHQL_RULINGS.md` |
