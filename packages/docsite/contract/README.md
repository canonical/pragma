# @canonical/prism-contract

The **data contract** between a Prism docsite and whatever GraphQL backend
serves it: the minimal schema surface a provider must offer, plus a check that
answers one question — *does this provider satisfy the contract?*

The docsite is being de-specialised: it should run against any conformant
provider, not only against the one ke-graphql happens to compile today. This
package is the machine-checkable statement of what "conformant" means.

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
tail is the IRI **local name**, never the full IRI (`…#Film` answers
`"Film"`). `label`, `comment`, and `definition` are asserted-only and
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
exactly that, so:

```
provider satisfies contract  ⇔  findBreakingChanges(contract, provider).length === 0
```

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
| Contract SDL does not parse | **throws** — the contract is ours, so a broken one is a programmer error |
| Provider is missing/narrows anything | one violation per graphql-js `BreakingChangeType` |

### Match on `code`, not on `message`

`code` is a graphql-js `BreakingChangeType` member and the member set is
identical in v16 and v17 — it is stable, and it is what you should assert on.
The `message` is graphql-js's own prose and it is **not** stable across majors:

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

## The gate in ke-graphql

ke-graphql — the reference provider — holds itself to this contract in its own
test suite: `src/testing/integration/contract.test.ts` (ke-graphql depends on
this package as a devDependency) compiles its whole fixture corpus and runs
`assertSatisfiesContract` on the **live emitted SDL**, plus two controls:

- `prefixing: "all"` still satisfies the contract — the knob-independence
  ruling, *measured* rather than assumed;
- `relay: false` fails by **exactly one** violation, `FIELD_REMOVED` on
  `Query.node` — proof the gate has teeth.

The SDL crosses that package boundary as a string, so the two-graphql-versions
hazard never materializes there either.

## Reading the contract SDL

```ts
import { readContractSdl, CONTRACT_SCHEMA_PATH } from "@canonical/prism-contract";
```

`readContractSdl()` returns the shipped SDL text and `CONTRACT_SCHEMA_PATH` is
its absolute path. They read the filesystem, and `satisfiesContract` imports
the reader statically and calls it live whenever the `contractSdl` option is
omitted — so the whole package is **Node/Bun only**. There is no browser entry
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
