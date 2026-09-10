# @canonical/dataviews-react

React bindings for Canonical collection views, built on `@canonical/dataviews-core`: the `DataViews` root, the provider context, and the four scoped observation hooks.

> **Stability: pre-1.0 / experimental.** The API is still consolidating and breaking changes may land between minor versions. Every breaking change ships with a conventional-commit subject and a CHANGELOG entry — those are the migration record. Pin a minor version if you need stability today.

## Installation

```bash
bun add @canonical/dataviews-react @canonical/dataviews-core
```

## Status

Under active development; the public surface grows change by change. The current exports:

- **`DataViews`** — the root component: mounts a provider created by `createDataViewsProvider` (from `@canonical/dataviews-core`) as the collection's context. Throws unless the provider is a genuine provider (referential identity check).
- **`useDataViews(provider)`** — the typed collection scope for custom children: result channel, selection, per-field handles and the bounded commands. The provider argument is an identity witness and must be the enclosing root's provider.
- **`useDataViewsValue(handle)`** — observe one channel; re-render only when it publishes.
- **`useDataViewsField(handle)`** — a field's input buffer, applied semantic value and feedback, with `edit`/`set`/`clear` routed through the provider.
- **`useDataViewsCell(provider)`** — the current cell's scope (row id, column id, observable row/fields/selected), installed by the table renderer; throws outside a rendered cell or on a witness mismatch.

The connected composition parts (Filters, Views, DataTable, Summary, Actions, Pagination) and Storybook land in later changes.
