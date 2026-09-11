# @canonical/dataviews-react

React bindings for Canonical collection views, built on `@canonical/dataviews-core`: the `DataViews` root with its connected `Filters` and `Pagination` parts, the provider context, the four scoped observation hooks, and the `DataTable` renderer.

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
- **`DataViews.Filters`** — the connected query-editing part. Which fields it offers and which operators each accepts come from the provider — its schema, and the capabilities its source declares — so it never offers a restriction the source would refuse, takes no query props, and has no draft query to keep in step with the applied one. Throws when the provider was created without the source's capabilities.
- **`DataViews.Pagination`** — the connected window navigation. Its destinations are the ones the collection can actually reach: a source that publishes a filtered total gets numbered pages and a last one, a source that publishes no count gets a Next offered only while the page is full, and a pending or failed replacement claims no total at all.
- **`DataTable`** — the row renderer: div rows over ARIA table roles, one shared column track list, sorting, selection and resizing. It takes its provider explicitly, so it behaves the same standalone and inside a `DataViews` root. A column's `sortable` is honoured only on a field the provider's source declares sortable — the same declaration `DataViews.Filters` reads — so the table never offers an ordering the source would refuse; a sortable column on a provider created without the source's capabilities throws.

The remaining connected parts (Views, Summary, Actions) land in later changes.

## Composition recipes

### The connected parts

```tsx
const machinesProvider = createDataViewsProvider({
  schema,
  // What the source can execute: Filters and the table's sortable columns
  // offer nothing beyond it, and the binding refuses a provider told
  // anything else.
  capabilities: source.capabilities,
});
createSourceBinding({ host: machinesProvider, adapter: source });

<DataViews provider={machinesProvider}>
  <DataViews.Filters labels={{ status: "Status", cpu: "Cores" }} />

  <DataTable provider={machinesProvider} columns={columns} label="Machines" />

  <div className="collection-footer">
    <DataViews.Pagination label="Machines pagination" />
  </div>
</DataViews>
```

Both parts read the enclosing root: they take presentation choices — a name,
visible field labels, the page sizes to offer — and never a second copy of
the query, the window or the selection the provider already owns. Ordinary
wrappers and custom children sit between them; moving pagination means moving
an element, not asking for a slot.

### Keeping the query in the URL

```tsx
function MachinesUrlQuery({ platform }: { platform: PlatformLocation }) {
  // Building the binding subscribes to nothing; observing does, so it
  // happens in an effect and a discarded render leaves nothing behind.
  const binding = useMemo(
    () =>
      createLocationBinding({
        host: machinesProvider,
        location: createPlatformLocation(platform),
      }),
    [platform],
  );
  useEffect(() => binding.observe(), [binding]);
  const issues = useDataViewsValue(binding.issues);
  return issues.length === 0 ? null : (
    <ul className="query-issues">
      {issues.map((issue, index) => (
        // One parameter can be refused for several reasons.
        <li key={`${index}:${issue.parameter}`}>{issue.reason}</li>
      ))}
    </ul>
  );
}
```

`createSourceBinding`, `createLocationBinding` and `createPlatformLocation`
come from `@canonical/dataviews-core`. Every edit the filters make writes the
canonical query to the location, and back, forward or a pasted URL is adopted
by the provider — one authority, no mirroring effect. A link carrying a clause
the grammar, the schema or the source refuses is not adopted: it stays in the
URL and its reasons are published on `binding.issues`, for the host to show
beside the controls. The parts read the provider either way.

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
- **Sorting** — offer a sort only on a field the source declares: `sortable` takes effect only where the provider's `capabilities` declare the field sortable, so pass the source's capabilities to `createDataViewsProvider`.
- **Selection** — real checkboxes named by `rowLabel`; select-all acts on the displayed rows.
- **Resizing and its limits** — held to the declared bounds; no control on the last column; one shared `presentation` gives two tables on a provider the same arrangement.
- **A cell that reads its own scope** — a renderer reading its row's channels.
- **The outcomes** — loading, failed, empty, no match, and retained rows that no longer answer the current query (`stale`), with `renderStatus`.
