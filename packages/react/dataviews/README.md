# @canonical/dataviews-react

React bindings for Canonical collection views, built on `@canonical/dataviews-core`: the `DataViews` root with its connected `Filters`, `Actions`, `Pagination` and `Views` parts, the provider context, the four scoped observation hooks, the `DataTable` renderer and the `PaginationBar`.

> **Stability: pre-1.0 / experimental.** The API is still consolidating and breaking changes may land between minor versions. Every breaking change ships with a conventional-commit subject and a CHANGELOG entry — those are the migration record. Pin a minor version if you need stability today.

## Installation

```bash
bun add @canonical/dataviews-react @canonical/dataviews-core
```

## Status

Under active development; the public surface grows change by change. The current exports:

- **`DataViews`** — the root component: mounts a provider created by `createDataViewsProvider` (from `@canonical/dataviews-core`) as the collection's context, observes it for as long as it is mounted — which starts the provider's source, location and saved views, ref-counted, so a table inside the root observing too costs nothing and a StrictMode rehearsal leaves a working provider — and owns the root's filter records. Throws unless the provider is one `createDataViewsProvider` built. Nothing is wired in an effect by the application: it builds the provider once, in state, and mounts.
- **`useDataViews(collection)`** — the typed collection scope for custom children: the collection's state channel, its rows, the refused URL clauses, selection, saved views, this root's filter handles and the bounded commands, `runAction` and `refusals` among them. The module-scope collection is the type and identity witness: it must be the one the enclosing root's provider was built over, so a custom child lives at module scope with no provider prop, and a nested root over another collection rejects it rather than answering with the wrong records typed as the right ones.
- **`useDataViewsValue(channel)`** — observe one channel; re-render only when it publishes.
- **`useDataViewsFilter(collection, field, operator)`** — one filter of the enclosing root: its text input, applied semantic value — typed by the field's kind — and feedback, with `edit`/`set`/`clear` routed through the root's record. The records are the root's: two roots over one provider share the applied query and never each other's half-typed input.
- **`useDataViewsCell(collection)`** — the current cell's scope (row id, column id, the read-only record channel typed as the collection's records, fields and selected channels), installed by the table renderer; throws outside a rendered cell or on a witness mismatch.
- **`DataViews.Filters`** — the connected query-editing part. Which fields it offers and which operators each accepts come from the provider — its collection's schema, and the capabilities its source declares — so it never offers a restriction the source would refuse, takes no query props, and has no draft query to keep in step with the applied one. An edit the source refuses keeps the restriction in force and says why beside the control.
- **`DataViews.Pagination`** — the connected window navigation: the `PaginationBar`, bound to the enclosing root's provider.
- **`DataViews.Actions`** — the connected action bar: the selection's count, the actions a caller places, and a button that clears the selection, on the design system's contrasted surface. It reads the root's selection, takes no copy of it, and is absent while nothing is selected.
- **`DataViews.Views`** — the connected saved views: which view is open, whether the query has moved from it, and switching, saving, saving as, renaming and deleting, over the store the provider was given. Throws when the provider has no store; without JavaScript it says only that views are unavailable.
- **`PaginationBar`** — the bar beneath a collection's rows, observing its provider like the table does: the page size, a summary of the items on screen out of the filtered total, a page select and first, previous, next and last buttons. Its destinations are the ones the collection can actually reach: a source that counts the rows the window pages over exactly gets a page total and a last page; one that counts them loosely or not at all gets a Next taken from the page's own word that more exists, or, failing that, offered only while the page is full; a source reaching its pages only through tokens is paged by those tokens, without a page total or a last page to jump to; and a pending or failed replacement claims no total at all.
- **`DataViews.DataTable`** — the connected table: the `DataTable` bound to the enclosing root's provider, with the same props less that provider.
- **`DataTable`** — the row renderer: div rows over ARIA table roles, one shared column track list, sorting, selection and resizing. It observes its provider for as long as it is mounted, so a standalone table is a complete screen on its own. A column's `sortable` is honoured only on a field the provider's source declares sortable — the same declaration `DataViews.Filters` reads — so the table never offers an ordering the source would refuse.

The remaining connected part, Summary, lands in a later change. The pagination bar already carries the result summary and the action bar the selection count, so `Summary` is designed not to repeat either.

**A provider comes by prop or by context, never both.** A standalone part — `DataTable`, `PaginationBar` — takes `provider` explicitly and never reads context, so it behaves the same alone and inside a root. A connected part — every `DataViews.*` — reads the enclosing root and throws outside one. Every standalone part has a connected twin whose props are its own less `provider`, and a connected part without a twin (`Filters`, `Actions`, `Views`) has no standalone form. The hooks read context and take the collection as their type and identity witness, so a child cannot be handed another collection's scope by mistake.

**One screen, in outline.** The collection is declared once at module scope; the provider is built once per page over it, its source and its ports; every part observes it:

```tsx
export const machines = createCollection({
  identify: (machine: Machine) => machine.id,
  fields: [
    { field: "name", kind: "text" },
    { field: "status", kind: "choices", options: ["running", "failed"] },
    { field: "cores", kind: "number", min: 1 },
  ],
});

function ExportNames() {
  const { rows } = useDataViews(machines);
  const names = useDataViewsValue(rows).entries.map((row) => row.record.name);
  return <button type="button" onClick={() => exportNames(names)}>Export</button>;
}

export function MachinesPage({ rows }: { rows: readonly Machine[] }) {
  const [provider] = useState(() =>
    createDataViewsProvider({
      collection: machines,
      source: createArraySource({ rows, collection: machines, searchFields: ["name"] }),
      location: createPlatformLocation(platform),
      views,
    }),
  );
  return (
    <DataViews provider={provider}>
      <DataViews.Views label="Machine views" />
      <DataViews.Filters />
      <DataViews.DataTable columns={columns} label="Machines" selectable />
      <ExportNames />
      <DataViews.Pagination label="Machines pagination" />
    </DataViews>
  );
}
```

## Composition recipes

The recipes, with consumer code and the live stories beside them, are the Storybook page **_work_in_progress / DataViews / Composition / Recipes** — source in [`src/lib/_work_in_progress/DataViews/DataViews.mdx`](src/lib/_work_in_progress/DataViews/DataViews.mdx):

- **The connected parts** — one root, every part reading its provider; place them in any order and any wrapper.
- **Keeping the query in the URL** — hand the provider a location and the URL is the query's other home, adopted before the first page is asked for; a refused link reports its reasons on `provider.issues`.

The parts have recipe pages of their own: [`Filters.mdx`](src/lib/_work_in_progress/DataViews/common/Filters/Filters.mdx), [`Actions.mdx`](src/lib/_work_in_progress/DataViews/common/Actions/Actions.mdx), [`Pagination.mdx`](src/lib/_work_in_progress/DataViews/common/Pagination/Pagination.mdx) and [`PaginationBar.mdx`](src/lib/_work_in_progress/PaginationBar/PaginationBar.mdx).

## Styles

Each component imports its own stylesheet, so a page that renders one has the rules it needs. A page that would rather have every rule present from the first paint — before the JavaScript of a lazily loaded route arrives — links the package's entry stylesheet instead:

```css
@import url("@canonical/dataviews-react/index.css");
```

The table assumes the `.app` context of `@canonical/styles`, which the page loads: render it inside an element carrying the `.app` class, where the design system's primary text takes its application sizes. It is dense wherever it sits — its root carries the design system's `.dense` class — and its rows and cells take their height and padding from the density channel that class sets; it defines no density rule of its own. Its sort chevrons and checkbox marks are `@canonical/ds-assets` icons, served at `/icons` like every other design-system icon.

The sheet is in the `ds.components.global` cascade layer and reads its colours, spacing, borders and type from `@canonical/design-tokens`. The one thing it cannot carry is the column track list: the solver derives that per render from the measured container, and the table publishes the data columns' tracks on itself as `--data-table-columns` (nothing at all when it has no columns), which every row consumes after the selection column's own track. That property is the table's own channel, not a customisation hook: the table writes it after any `style` it is given.

The pagination bar's selects are the design system's `SelectInput`, whose input chrome is in the `@canonical/react-ds-global-form` stylesheet: a page that renders the bar loads `@canonical/react-ds-global-form/dist/esm/index.css` beside `@canonical/styles`. The bar sticks to the bottom of whatever scrolls it. The action bar sits on the design system's contrasted surface, `.contrasted`, and paints nothing of its own.

## DataTable recipes

The recipes, with consumer code and the live stories beside them, are the Storybook page **_work_in_progress / DataTable / Recipes** — under **DataViews** in the Storybook hub — source in [`src/lib/_work_in_progress/DataTable/DataTable.mdx`](src/lib/_work_in_progress/DataTable/DataTable.mdx):

- **A table over a provider** — build the provider once, over the collection and its source, and mount: the table observes it.
- **Columns and sizing** — fixed and flexible widths, bounds, and the last column taking the rest.
- **Sorting** — offer a sort only on a field the source declares: `sortable` takes effect only where the source's declaration, read by the provider, names the field sortable.
- **Selection** — the design system's checkboxes in a 32px column, named by `rowLabel`; select-all acts on the displayed rows.
- **Resizing and its limits** — held to the declared bounds; no control on the last column; one shared `layout` gives two tables on a provider the same arrangement.
- **A cell that reads its own scope** — a module-scope renderer reading its row's record through `useDataViewsCell(collection)`, typed by the collection.
- **The outcomes** — loading, failed, empty and no match in place of the rows; a failed refresh and retained rows that no longer answer the current query (`refresh-failed`, `stale`) beside them, with `renderStatus`.
- **Mounting only the rows in view** — `windowing={virtualizeRows({ estimatedRowHeight })}`, from `@canonical/dataviews-react/virtualization`, for a result window of thousands of rows: the table becomes its own scroll viewport and every row still counts.
