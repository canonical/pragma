# @canonical/dataviews-react

React bindings for Canonical collection views, built on `@canonical/dataviews-core`: the `DataViews` root, the provider context, the four scoped observation hooks, and the `DataTable` renderer.

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
- **`useDataViewsCell(provider)`** — the current cell's scope (row id, column id, read-only row/fields/selected channels), installed by the table renderer; throws outside a rendered cell or on a witness mismatch.
- **`DataTable`** — the row renderer: div rows over ARIA table roles, one shared column track list, sorting, selection and resizing. It takes its provider explicitly, so it behaves the same standalone and inside a `DataViews` root.

The remaining connected parts (Filters, Views, Summary, Actions, Pagination) land in later changes.

## Styles

`DataTable` imports its own stylesheet, so a page that renders one has the rules it needs. A page that would rather have every rule present from the first paint — before the JavaScript of a lazily loaded route arrives — links the package's entry stylesheet instead:

```css
@import url("@canonical/dataviews-react/index.css");
```

The table assumes the `.app` typography scope: render it inside an element carrying the `.app` class, where the design system's primary text takes its application sizes. It takes its type from that scope rather than pinning a line height of its own.

The sheet is in the `ds.components.global` cascade layer and reads its colours, spacing, borders and type from `@canonical/design-tokens`. The one thing it cannot carry is the column track list: the solver derives that per render from the measured container, and the table publishes it on itself as `--data-table-columns`, which every row consumes. That property is the table's own channel, not a customisation hook: the table writes it after any `style` it is given.

## DataTable recipes

The recipes, with consumer code and the live stories beside them, are the Storybook page **_work_in_progress / DataTable / Recipes** — under **DataViews** in the Storybook hub — source in [`src/lib/DataTable/DataTable.mdx`](src/lib/DataTable/DataTable.mdx):

- **A table over a provider** — build the provider once and bind the source in an effect.
- **Columns and sizing** — fixed and flexible widths, bounds, and the last column taking the rest.
- **Sorting** — offer a sort only on a field the source declares.
- **Selection** — real checkboxes named by `rowLabel`; select-all acts on the displayed rows.
- **Resizing and its limits** — held to the declared bounds; no control on the last column; one shared `presentation` gives two tables on a provider the same arrangement.
- **A cell that reads its own scope** — a renderer reading its row's channels.
- **The four outcomes** — loading, failed, empty and no match, and `renderStatus`.
