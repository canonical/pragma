# @canonical/dataviews-react

React bindings for Canonical collection views, built on `@canonical/dataviews-core`: the `DataViews` root with its connected `Filters`, `Actions`, `Pagination` and `Views` parts, the provider context, the four scoped observation hooks, the `DataTable` renderer and the `PaginationBar`.

> **Stability: pre-1.0 / experimental.** The API is still consolidating and breaking changes may land between minor versions. Every breaking change ships with a conventional-commit subject and a CHANGELOG entry — those are the migration record. Pin a minor version if you need stability today.

## Installation

```bash
bun add @canonical/dataviews-react @canonical/dataviews-core
```

## Status

Under active development; the public surface grows change by change. The current exports:

- **`DataViews`** — the root component: mounts a provider created by `createDataViewsProvider` (from `@canonical/dataviews-core`) as the collection's context. Throws unless the provider is a genuine provider (referential identity check).
- **`useDataViews(provider)`** — the typed collection scope for custom children: the collection's state channel, its rows, selection, per-field handles and the bounded commands. The provider argument is an identity witness and must be the enclosing root's provider.
- **`useDataViewsValue(handle)`** — observe one channel; re-render only when it publishes.
- **`useDataViewsField(handle)`** — a field's text input, applied semantic value and feedback, with `edit`/`set`/`clear` routed through the provider.
- **`useDataViewsCell(provider)`** — the current cell's scope (row id, column id, read-only row/fields/selected channels), installed by the table renderer; throws outside a rendered cell or on a witness mismatch.
- **`DataViews.Filters`** — the connected query-editing part. Which fields it offers and which operators each accepts come from the provider — its schema, and the capabilities its source declares — so it never offers a restriction the source would refuse, takes no query props, and has no draft query to keep in step with the applied one. Throws when the provider was created without the source's capabilities.
- **`DataViews.Pagination`** — the connected window navigation: the `PaginationBar`, bound to the enclosing root's provider.
- **`DataViews.Actions`** — the connected action bar: the selection's count, the actions a caller places, and a button that clears the selection, on the design system's contrasted surface. It reads the root's selection, takes no copy of it, and is absent while nothing is selected.
- **`DataViews.Views`** — the connected saved views: which view is open, whether the query has moved from it, and switching, saving, saving as, renaming and deleting, over the store the provider was given. Throws when the provider has no store; without JavaScript it says only that views are unavailable.
- **`PaginationBar`** — the bar beneath a collection's rows: the page size, a summary of the items on screen out of the filtered total, a page select and first, previous, next and last buttons. Its destinations are the ones the collection can actually reach: a source that counts the rows the window pages over exactly gets a page total and a last page; one that counts them loosely or not at all gets a Next taken from the page's own word that more exists, or, failing that, offered only while the page is full; a source reaching its pages only through tokens is paged by those tokens, without a page total or a last page to jump to; and a pending or failed replacement claims no total at all.
- **`DataViews.DataTable`** — the connected table: the `DataTable` bound to the enclosing root's provider, with the same props less that provider.
- **`DataTable`** — the row renderer: div rows over ARIA table roles, one shared column track list, sorting, selection and resizing. A column's `sortable` is honoured only on a field the provider's source declares sortable — the same declaration `DataViews.Filters` reads — so the table never offers an ordering the source would refuse; a sortable column on a provider created without the source's capabilities throws.

The remaining connected part, Summary, lands in a later change. The pagination bar already carries the result summary and the action bar the selection count, so `Summary` is designed not to repeat either.

**A provider comes by prop or by context, never both.** A standalone part — `DataTable`, `PaginationBar` — takes `provider` explicitly and never reads context, so it behaves the same alone and inside a root. A connected part — every `DataViews.*` — reads the enclosing root and throws outside one. Every standalone part has a connected twin whose props are its own less `provider`, and a connected part without a twin (`Filters`, `Actions`, `Views`) has no standalone form. The hooks read context and take the provider as an identity witness, so a child cannot be handed another collection's scope by mistake.

## Composition recipes

The recipes, with consumer code and the live stories beside them, are the Storybook page **_work_in_progress / DataViews / Composition / Recipes** — source in [`src/lib/DataViews/DataViews.mdx`](src/lib/DataViews/DataViews.mdx):

- **The connected parts** — one root, every part reading its provider; place them in any order and any wrapper.
- **Keeping the query in the URL** — a location binding makes the URL the query's other home, and a refused link reports its reasons on `binding.issues`.

The parts have recipe pages of their own: [`Filters.mdx`](src/lib/DataViews/common/Filters/Filters.mdx), [`Actions.mdx`](src/lib/DataViews/common/Actions/Actions.mdx), [`Pagination.mdx`](src/lib/DataViews/common/Pagination/Pagination.mdx) and [`PaginationBar.mdx`](src/lib/PaginationBar/PaginationBar.mdx).

## Styles

Each component imports its own stylesheet, so a page that renders one has the rules it needs. A page that would rather have every rule present from the first paint — before the JavaScript of a lazily loaded route arrives — links the package's entry stylesheet instead:

```css
@import url("@canonical/dataviews-react/index.css");
```

The table assumes the `.app` context of `@canonical/styles`, which the page loads: render it inside an element carrying the `.app` class, where the design system's primary text takes its application sizes. It is dense wherever it sits — its root carries the design system's `.dense` class — and its rows and cells take their height and padding from the density channel that class sets; it defines no density rule of its own. Its sort chevrons and checkbox marks are `@canonical/ds-assets` icons, served at `/icons` like every other design-system icon.

The sheet is in the `ds.components.global` cascade layer and reads its colours, spacing, borders and type from `@canonical/design-tokens`. The one thing it cannot carry is the column track list: the solver derives that per render from the measured container, and the table publishes the data columns' tracks on itself as `--data-table-columns` (nothing at all when it has no columns), which every row consumes after the selection column's own track. That property is the table's own channel, not a customisation hook: the table writes it after any `style` it is given.

The pagination bar's selects are the design system's `SelectInput`, whose input chrome is in the `@canonical/react-ds-global-form` stylesheet: a page that renders the bar loads `@canonical/react-ds-global-form/dist/esm/index.css` beside `@canonical/styles`. The bar sticks to the bottom of whatever scrolls it. The action bar sits on the design system's contrasted surface, `.contrasted`, and paints nothing of its own.

## DataTable recipes

The recipes, with consumer code and the live stories beside them, are the Storybook page **_work_in_progress / DataTable / Recipes** — under **DataViews** in the Storybook hub — source in [`src/lib/DataTable/DataTable.mdx`](src/lib/DataTable/DataTable.mdx):

- **A table over a provider** — build the provider once and bind the source in an effect.
- **Columns and sizing** — fixed and flexible widths, bounds, and the last column taking the rest.
- **Sorting** — offer a sort only on a field the source declares: `sortable` takes effect only where the provider's `capabilities` declare the field sortable, so pass the source's capabilities to `createDataViewsProvider`.
- **Selection** — the design system's checkboxes in a 32px column, named by `rowLabel`; select-all acts on the displayed rows.
- **Resizing and its limits** — held to the declared bounds; no control on the last column; one shared `layout` gives two tables on a provider the same arrangement.
- **A cell that reads its own scope** — a renderer reading its row's channels.
- **The outcomes** — loading, failed, empty and no match in place of the rows; a failed refresh and retained rows that no longer answer the current query (`refresh-failed`, `stale`) beside them, with `renderStatus`.
- **Mounting only the rows in view** — `windowing={virtualRows({ estimatedRowHeight })}`, from `@canonical/dataviews-react/virtualization`, for a result window of thousands of rows: the table becomes its own scroll viewport and every row still counts.
