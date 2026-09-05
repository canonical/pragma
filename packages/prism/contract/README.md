# @canonical/prism-contract

The **data contract** between a Prism docsite and whatever GraphQL backend
serves it: the minimal schema surface a provider must offer, plus a check that
answers one question — *does this provider satisfy the contract?*

The docsite is being de-specialised: it should run against any conformant
provider, not only against the one ke-graphql happens to compile today. This
package is the machine-checkable statement of what "conformant" means.

## Installation

```bash
bun add @canonical/prism-contract
```

`graphql` is a **peer** dependency (`^16.11.0 || ^17.0.0-rc.0`) — you supply
it, and the check builds both schemas with your copy. That is deliberate: see
[The check](#the-check).

## What is in the contract

The contract is the surface the ke-graphql compiler emits **unconditionally** —
the part that does not depend on which ontology was loaded or which options
were passed:

| Group | Members |
| --- | --- |
| Relay structure | `Node`, `PageInfo`, `NodeConnection`, `NodeEdge` |
| TBox (hand-written) | `Ontology`, `OntologyClass`, `ClassProperty`, `OntologyProperty`, `PropertyKind`, `EntityMeta` |
| Root fields | `ontologies`, `ontology`, `ontologyClass`, `ontologyProperty`, `node(id:)` |

`Node` is identity plus self-description and nothing else — the absolute IRI
and the `_meta` hatch every descriptive fact lives behind:

```graphql
interface Node {
  uri: ID!
  _meta: EntityMeta!
}
```

`EntityMeta.title` is **total**: the provider computes a fallback chain whose
tail is the IRI **local name** (`…#Film` answers `"Film"`), with the whole IRI
below it for an IRI that ends in a separator and so has no local name — the
degenerate tier that keeps the field total rather than an exception to it.
`label`, `comment`, and `definition` are asserted-only and
nullable. `OntologyClass` implements `Node`, so classes resolve through
`node(id:)` and ride `NodeConnection`s like any other entity;
`OntologyProperty` deliberately does not (identity, but no `_meta` — an
asymmetry of scope, not principle).

The contract names **no ontology terms** — its surface is purely structural —
so it is independent of the provider's field-name `prefixing` knob: a schema
compiled with `prefixing: "all"` satisfies it exactly as one compiled with
`prefixing: "none"` does.

`Query.ontologyClass(uri:)` and `Query.ontologyProperty(uri:)` take
`String!`, **not** `ID!`: those arguments accept the prefixed convenience form
(`"ds:Component"`) and live client operations already declare
`$uri: String!`, which `ID!` would invalidate. `node(id:)` is the strict
lookup by absolute IRI.

### What is deliberately excluded

- **`@defer` / `@stream`.** The compiler adds them only when composed with
  `incremental: true`. A provider that does not do incremental delivery is
  still conformant, so requiring them would be wrong.
- **Every ontology-derived type** (`Component`, `Job`, `CodeStandard`, …).
  Those are a function of the loaded ontology, not of the contract.
- **Provider extension fields** such as
  `OntologyProperty.acceptanceCriteria` / `.completionGuidance`.
  Annotation-derived and provider-specific — extensions, not base.

`EntityMeta` **is** in the contract: `Node` selects it through `_meta`, and
the compiler attaches `_meta: EntityMeta!` to every generated type, so a
provider cannot omit it.

## The check

```ts
import {
  satisfiesContract,
  assertSatisfiesContract,
} from "@canonical/prism-contract";

const result = satisfiesContract(providerSdl);
// { satisfied: boolean, violations: readonly ContractViolation[] }

assertSatisfiesContract(providerSdl, { providerName: "ke-graphql backend" });
// throws, listing every violation, unless satisfied
```

### Why it is not a diff

A real provider's SDL is a **strict superset** of the contract — it adds every
ontology-derived type — so it always differs textually and always will.
Comparing ASTs or text would fail on every conformant provider.

The right predicate is *semantic subsumption*: could every operation legal
against the contract also run against the provider? graphql-js already answers
exactly that for the shape of the two schemas, so:

```
provider satisfies contract  ⇔  findBreakingChanges(contract, provider).length === 0
                                AND the provider serves each of the contract's
                                operations from a root type of the same name
```

The second conjunct is not decoration. `findBreakingChanges` compares type maps
by NAME and never looks at which type a schema uses as a root, so a provider
that declares `schema { query: RootQuery }` and leaves a conforming but
unreachable `type Query` in its type map is structurally indistinguishable from
a conformant one — and serves nothing. That is the one conformance failure
graphql-js cannot report, so this package reports it, as `ROOT_TYPE_MISMATCH`.
An operation the contract does not name (it names no mutation today) puts no
obligation on a provider.

`findDangerousChanges` is **not** consulted. Adding an optional argument or a
new enum value is dangerous for a *client* but perfectly legal for a superset
*provider*, and every real provider does both.

### SDL in, never a schema object

Both entry points take the provider's SDL as a **string**, never a
`GraphQLSchema`. Two graphql versions coexist in this repo (the app's v16 and
ke-graphql's pinned v17 RC) and an object built by one must never reach the
other — the app documents the same hazard on its execute boundary. Text is the
only safe currency across that line, which is why **graphql** is a *peer*
dependency here and accepts either major.

### Failure modes

| Situation | Behaviour |
| --- | --- |
| Provider SDL does not parse | one violation, code `INVALID_SDL` — a provider that cannot be parsed has failed the contract; that is a result, not a crash |
| Provider SDL parses but is not a valid schema | one violation per schema error, code `INVALID_SCHEMA` — a schema graphql refuses to execute cannot subsume anything, however few structural differences it has |
| Contract SDL does not parse, or is not a valid schema | **throws** — the contract is ours, so a broken one is a programmer error |
| Provider is missing/narrows anything | one violation per graphql-js `BreakingChangeType` |
| Provider serves a contract operation from a differently named root type | one violation, code `ROOT_TYPE_MISMATCH` — the type map may match perfectly and the operation still not reach it |

### Match on `code`, not on `message`

`code` is typed as `ContractViolationCode`: graphql-js's sixteen
`BreakingChangeType` members, whose set is identical in v16 and v17, plus the
three this package defines itself (`INVALID_SDL`, `INVALID_SCHEMA`,
`ROOT_TYPE_MISMATCH`). It is
stable, it completes and switches exhaustively, and it is what you should assert
on. The `message` is graphql-js's own prose and it is **not** stable across
majors:

| | v16.13.1 | v17.0.0-rc.0 |
| --- | --- | --- |
| field | `Node._meta was removed.` | `Field Node._meta was removed.` |
| argument | `Query.ontology arg prefix was removed.` | `Argument Query.ontology(prefix:) was removed.` |

Messages are for humans reading a failure; codes are for machines gating one.

### A note on `TYPE_REMOVED` noise

When a provider is deficient enough that it stops referencing a built-in scalar
the contract uses, graphql-js also reports e.g. `Standard scalar Int was
removed because it is not referenced anymore.` This is not filtered out. It
never appears
on its own — a genuinely conformant provider produces zero violations — and
suppressing `TYPE_REMOVED` would mask a real type removal, which is exactly the
kind of breakage this package exists to catch.

## Where the gate runs

The check runs on the **provider's** side, never on the compiler's. A GraphQL
compiler that carried its own conformance check would be marking its own
homework, and the repository's layering rule settles it independently — see
"The documentation site depends on the runtime, never the reverse" in
`AGENTS.md`. So `@canonical/ke-graphql` does not depend on this package and
holds no contract test.

Two gates exist today, with a third arriving per provider package.

The first is in this package, in `src/lib/satisfiesContract.test.ts`. It runs
the check against hand-maintained illustrations of a compiler emission
(`src/testing/__fixtures__/emitted*.sdl.txt` — approximations of the shape, not
byte captures) and pins three properties:

- the emitted base satisfies the contract;
- `prefixing: "all"` still satisfies it — the contract names no ontology
  terms, so the knob cannot affect conformance. Measured, not assumed;
- `relay: false` fails by **exactly one** violation, `FIELD_REMOVED` on
  `Query.node` — the control that proves the gate has teeth.

The second, `src/testing/integration/emittedGoldens.test.ts`, is the currency
gate. The fixtures above are frozen captures, so on their own they would go on
satisfying the fixture-era contract forever. This one reads
`@canonical/ke-graphql`'s own golden SDLs — which that package regenerates and
pins byte-for-byte against a live `compile()` — and checks all of them against
`schema/contract.graphql` as read live. Both halves move on their own, so it
turns red when they stop agreeing.

A third belongs to each provider package built on this contract, as those land:
it calls `assertSatisfiesContract` on that provider's own SDL, so the gate
fails the moment that provider drifts. Siting those there rather than here is
what keeps this package free of any dependency on a particular provider.

The SDL crosses every one of those boundaries as a **string**, so the
two-graphql-versions hazard never materializes.

## Reading the contract SDL

```ts
import { readContractSdl } from "@canonical/prism-contract";
```

`readContractSdl()` returns the shipped SDL text. It reads the filesystem, and
`satisfiesContract` imports it statically and calls it live whenever the
`contractSdl` option is omitted — so the whole package is **Node/Bun only**.
For a consumer that wants the file rather than its contents, the
`./schema/contract.graphql` subpath export is the handle; the package
deliberately publishes no constant naming its own on-disk layout. There is no browser entry
point: the check belongs in provider gates and CI steps, which run
server-side. (The `contractSdl` option exists to substitute a toy contract in
tests, not to make the module bundleable.)

The SDL itself lives in the `schema/` directory at the package root and is
published alongside `dist/`.

## Scripts

| Script | What it does |
| --- | --- |
| `bun run build` | `tsc -p tsconfig.build.json` |
| `bun run check` | biome + `tsc --noEmit` + `webarchitect library` |
| `bun run test` | `vitest run --coverage` |

Coverage thresholds sit at 100% — the repo standard for a shipped package.
Never lower them.
