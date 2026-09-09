# @canonical/dataviews-core

Framework-agnostic core for Canonical collection views. It holds the bounded query grammar with its window projection, the schema layer — field definitions with inferred types and enforced semantics — observation channels and explicit-ID selection, the field/operation/save-race interaction records, the collection coordinator that owns query/window coherence and the request lifecycle, and the provider that assembles all of it into the one owner a UI binds to. Logic, never markup; framework bindings, URL transport and data-source adapters are wired above this layer.

> **Stability: pre-1.0 / experimental.** The API is still consolidating and breaking changes may land between minor versions. Every breaking change ships with a conventional-commit subject and a CHANGELOG entry — those are the migration record. Pin a minor version if you need stability today.

## Installation

```bash
bun add @canonical/dataviews-core
```

## Status

Under active development; the public surface grows change by change. The current runtime exports are `createIdentity`, `isIdentity`, `canonicalSlice`, `sliceEquals`, `applyWindow`, `createSchema`, `createChannel`, `createSelection`, `createFieldInteraction`, `createOperation`, `createCollectionCoordinator` and `createSaveSession`, together with their config, state, result, grammar and schema types (`Slice`, `ResultWindow`, `QueryCommand`, `CompletionResult`, `Schema`, `Channel`, `Selection` and friends re-exported from the package root):

- **Identity tokens** — `createIdentity`, `isIdentity`: referential scope markers; structural copies and forged-key look-alikes are rejected.
- **Query grammar** — `Slice`/`ResultWindow` types, `canonicalSlice` (equality operands are sets, sort order is never reordered, empty search is no search), `sliceEquals` for semantic equality, `applyWindow` for the displayed-window projection.
- **Schema** — `createSchema`: the one coherent construction path; field kinds (`choices`, `number`, `flag`, `date`) decide legal operators and inferred applied types; buffers and direct operands are validated against option membership, numeric range and ISO-8601 dates.
- **Observation** — `createChannel`: observation channels with equality-guarded notification; the caller keys one channel per state category; `createSelection`: explicit record identities with a valid empty state.
- **Provider** — `createDataViewsProvider`: assembles the coordinator, selection and per-field interaction records into the one owner a UI binds to, publishing keyed channels at mutation boundaries.
- **Field interaction** — `createFieldInteraction`: input buffer and feedback for one filter field; invalid or incomplete edits retain the applied predicate; explicit `clear` is distinct from invalid input.
- **Operation record** — `createOperation`: captures targets and selection revision immutably at construction so later selection changes never retarget execution; partial outcomes settle each target once; retry re-runs only failed targets.
- **Collection coordinator** — `createCollectionCoordinator`: addressed commands as coherent query+window transitions (a query change resets the page), request identities whose stale completions are ignored, atomic publication of rows/provenance/count, scope rotation, and `adopt` for externally authoritative state such as back/forward navigation.
- **Save race** — `createSaveSession`: a save completion updates only the submitted baseline, so edits made while saving remain dirty; delayed external reads never overwrite newer local state.

Rows are opaque to the core: adapters execute request identities and publish completions; nothing here knows a data source, a router or the DOM.
