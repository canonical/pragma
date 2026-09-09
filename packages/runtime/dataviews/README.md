# @canonical/dataviews-core

Framework-agnostic core for Canonical collection views. It holds the bounded query grammar and addressed commands, the field/operation/save-race interaction records, and the collection coordinator that owns query/window coherence and the request lifecycle — logic, never markup. Framework bindings, URL transport and data-source adapters are wired above this layer.

> **Stability: pre-1.0 / experimental.** The API is still consolidating and breaking changes may land between minor versions. Every breaking change ships with a conventional-commit subject and a CHANGELOG entry — those are the migration record. Pin a minor version if you need stability today.

## Installation

```bash
bun add @canonical/dataviews-core
```

## Status

Under active development; the public surface grows change by change. The current runtime exports are `createIdentity`, `isIdentity`, `canonicalSlice`, `sliceEquals`, `createFieldInteraction`, `createOperation`, `createCollectionCoordinator` and `createSaveSession`, together with their config, state, result and grammar types (`Slice`, `ResultWindow`, `QueryCommand`, `CompletionResult` and friends re-exported from the package root):

- **Identity tokens** — `createIdentity`, `isIdentity`: referential scope markers; structural copies and forged-key look-alikes are rejected.
- **Query grammar** — `Slice`/`ResultWindow` types, `canonicalSlice` (equality operands are sets, sort order is never reordered, empty search is no search), `sliceEquals` for semantic equality.
- **Field interaction** — `createFieldInteraction`: input buffer and feedback for one filter field; invalid or incomplete edits retain the applied predicate; explicit `clear` is distinct from invalid input.
- **Operation record** — `createOperation`: captures targets and selection revision immutably at construction so later selection changes never retarget execution; partial outcomes settle each target once; retry re-runs only failed targets.
- **Collection coordinator** — `createCollectionCoordinator`: addressed commands as coherent query+window transitions (a query change resets the page), request identities whose stale completions are ignored, atomic publication of rows/provenance/count, scope rotation, and `adopt` for externally authoritative state such as back/forward navigation.
- **Save race** — `createSaveSession`: a save completion updates only the submitted baseline, so edits made while saving remain dirty; delayed external reads never overwrite newer local state.

Rows are opaque to the core: adapters execute request identities and publish completions; nothing here knows a data source, a router or the DOM.
