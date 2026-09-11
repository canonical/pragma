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

### A table over a provider

```tsx
const columns = [
  { id: "name", header: "Name", sortable: true },
  { id: "status", header: "Status" },
];

<DataTable provider={provider} columns={columns} label="Machines" />;
```

Every column shows the record field named by its id. `field` names a different
one. Primitive values render as text; anything else needs a renderer.

### One column with its own content

```tsx
const Status = ({ value }: DataTableCellProps) => (
  <Chip criticality={value === "failed" ? "error" : "success"} value={String(value)} />
);

const columns = [
  { id: "name", header: "Name" },
  { id: "status", header: "Status", cell: Status },
];
```

The renderer runs inside its cell's scope, so it may call `useDataViewsCell`
for the row's channels — the whole record, another field, or the row's
selection — without the table handing every cell a copy of the record.

### Selection

```tsx
<DataTable
  provider={provider}
  columns={columns}
  label="Machines"
  selectable
  rowLabel={(row) => row.name}
/>
```

Real checkboxes, backed by the provider's selection. The header control acts
on the displayed rows and leaves a selection made elsewhere alone; `rowLabel`
names each record so its checkbox says which row it is.

### Sizing and resizing

```tsx
const columns = [
  { id: "select", header: "", sizing: { kind: "fixed", px: 40 } },
  { id: "name", header: "Name", sizing: { kind: "flex", weight: 2, minPx: 160 }, resizable: true },
  { id: "status", header: "Status", sizing: { kind: "flex", weight: 1, minPx: 96, maxPx: 240 } },
];
```

Fixed columns keep their width, flexible ones compress within their bounds,
and the table scrolls horizontally once the remainder no longer fits. The last
column takes whatever width the others leave, past its own maximum when there
is room to spare. Resizing works from the pointer
and from the keyboard — arrow keys step the edge, Escape abandons a drag — and
a user-fixed width is never quietly shrunk to suit the viewport. Every resize
is held to the column's declared `minPx` and `maxPx`, however often it has
been resized, and a column widened past the container scrolls the table to
keep its edge in view. The last column has no resize control, even when it is
declared `resizable`: its trailing edge is the table's own edge, with nothing
beyond it to resize against. Pass a shared `presentation` to give two tables on one
provider the same user arrangement.

### Empty, loading and failed

```tsx
<DataTable
  provider={provider}
  columns={columns}
  label="Machines"
  renderStatus={(status) => <EmptyState kind={status.kind} />}
/>
```

The four outcomes stay distinct: nothing displayable yet, a failed read, an
unfiltered collection with nothing in it, and a query that matched nothing.
