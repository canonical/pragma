# @canonical/dataviews-core

Framework-agnostic core for Canonical collection views. It holds the bounded query grammar with its window projection, the schema layer — field definitions with inferred types and enforced semantics — observation channels and explicit-ID selection, the field/operation/save-race interaction records, the collection coordinator that owns query/window coherence and the request lifecycle, and the provider that assembles all of it into the one owner a UI binds to. It also holds the source contract and its first sources, which execute the request identities the coordinator issues. Logic, never markup; framework bindings are wired above this layer.

> **Stability: pre-1.0 / experimental.** The API is still consolidating and breaking changes may land between minor versions. Every breaking change ships with a conventional-commit subject and a CHANGELOG entry — those are the migration record. Pin a minor version if you need stability today.

## Installation

```bash
bun add @canonical/dataviews-core
```

## Status

Under active development; the public surface grows change by change. The current runtime exports are `createIdentity`, `isIdentity`, `canonicalSlice`, `sliceEquals`, `applyWindow`, `createSchema`, `createChannel`, `createSelection`, `createFieldInteraction`, `createOperation`, `createCollectionCoordinator`, `createSaveSession`, `createDataViewsProvider`, `createMemoryLocation`, `createPlatformLocation`, `createLocationBinding`, `encodeQuery`, `decodeQuery`, `createRowModel`, `createRowScopes`, `displayEntries`, `resolveColumns`, `columnTemplate`, `createColumnLayout`, `createGridInteraction`, `sizingEquals`, `createSourceBinding`, `createArraySource`, `createQuerySource`, `createRelaySource`, `supportsRequest` and `executeSlice`, the query helper `collapseSortTerms`, the schema check `isCalendarDate`, the row read `readField`, the two seed constants `EMPTY_SLICE` and `DEFAULT_WINDOW`, together with their config, state, result, grammar, saved-view and schema types (`Slice`, `ResultWindow`, `Query`, `QueryCommand`, `SourcePage`, `Completion`, `SourceCapabilities`, `ViewStore`, `Schema`, `Channel`, `Selection` and friends re-exported from the package root):

- **Identity tokens** — `createIdentity`, `isIdentity`: referential scope markers; structural copies and forged-key look-alikes are rejected.
- **Query grammar** — `Slice` (filters, search, ordered sort terms, ordered grouping levels) and `ResultWindow` (page, size, cursor token, collapsed group paths), paired as `Query`; `canonicalSlice` (equality operands are sets, sort order is never reordered, empty search is no search), `sliceEquals` for semantic equality, `applyWindow` for the displayed-window projection, and `EMPTY_SLICE` and `DEFAULT_WINDOW` — the query that restricts nothing and the window a collection starts on — as the two halves of a `Query` to seed, adopt or encode.
- **Schema** — `createSchema`: the one coherent construction path; field kinds (`choices`, `number`, `flag`, `date`, `text`) decide legal operators, how an ordered term over the field compares, and inferred applied types; inputs and direct operands are validated against option membership, numeric range and ISO-8601 dates. A `text` field is ordered and filtered by nothing — the grammar has no substring operator — so `schema.listOperators("name")` is empty and no filter control is offered for it.
- **Observation** — `createChannel`: observation channels with equality-guarded notification; the caller keys one channel per state category. `ReadonlyChannel` is the read side handed to projections. `createSelection`: explicit record identities with a valid empty state.
- **Provider** — `createDataViewsProvider`: assembles the coordinator, selection and per-field interaction records into the one owner a UI binds to, publishing keyed channels at mutation boundaries. Given the bound source's `capabilities`, it carries them so connected parts and DataTable's sortable columns offer only what the source can execute — `DataViews.Filters`, and a `DataTable` with a sortable column, require them — and `createSourceBinding` refuses a provider told anything other than its source's own declaration.
- **Location** — `Location` port plus `createMemoryLocation` (local/secondary collections, fixture harness) and `createPlatformLocation` (over a host platform surface such as a router's platform adapter — repeated query parameters survive every read and write).
- **Wire grammar** — `encodeQuery`/`decodeQuery`: the flat, form-compatible spelling of a query as URL parameters (`status=failed&status=cancelled`, `cpu__gte=4`, `owner__isSet=1`, `q=yak`, `sort=updated__desc`, `group=status`, `page=2&size=50&cursor=…`). Values are parsed to their field's own type, operators are checked against the field's kind, and — given the source's capabilities — clauses the source cannot execute are refused too; every refused clause is left out of the query and reported by parameter. Parameters naming no field of the collection are the host's and survive untouched. A host builds its own links, such as no-JS pagination destinations, with `encodeQuery` and the parameters it wants preserved. Given a null window, `encodeQuery` writes the query alone — the text a saved view stores.
- **Location binding** — `createLocationBinding`: the authority loop. Every accepted transition writes the canonical query to the location, every external location change — back, forward, a pasted URL — is adopted, and neither direction echoes into the other. A location carrying no query takes the host's seed; one carrying a clause the grammar, the schema or the source refused is left standing, so the error survives a reload instead of quietly being rewritten to a broader query. Seeding and canonicalizing replace the history entry; only the host's own transitions follow the configured `history` mode,.
- **Field interaction** — `createFieldInteraction`: text input and feedback for one filter field; invalid or incomplete edits retain the applied predicate; explicit `clear` is distinct from invalid input.
- **Operation record** — `createOperation`: captures targets and selection revision immutably at construction so later selection changes never retarget execution; partial outcomes settle each target once; retry re-runs only failed targets.
- **Collection coordinator** — `createCollectionCoordinator`: addressed commands as coherent query+window transitions (a query change resets the page), request identities whose superseded completions are ignored, atomic publication of rows, group summaries, counts, cursors and provenance, scope rotation, and `adopt` for externally authoritative state such as back/forward navigation. Provenance is the request the coordinator issued — the slice and window the rows answer — never anything the source says about them. A refusal or failure over retained rows reports `refreshFailed` while those rows still answer the current query, so a failed refresh is never silent; over rows an earlier query produced it reports `stale`; with no rows at all it reports `failed`.
- **Rows** — `createRowModel`: the ordered model of one result, keyed by each record's stable identity rather than its position, carrying unchanged entries across reorders and republications, and answering with a result rather than throwing, so an ambiguous identity fails the completion the rows arrived in instead of the call that built them; `createRowScopes`: one observation scope per row identity, shared by every cell of that row, with a channel per observed field so an unchanged value never notifies its cell.
- **Geometry** — `resolveColumns`: fixed columns reserve their declared width, flexible ones share what is left by weight until capped, and declared widths survive an overflow (the container scrolls); `createColumnLayout`: declared sizing plus user-fixed overrides; `createGridInteraction`: one clamped live resize preview that never touches the authority until it commits; `columnTemplate`: the resolved geometry as the one CSS track list a renderer publishes.
- **Save race** — `createSaveSession`: a save completion updates only the submitted baseline, so edits made while saving remain dirty; delayed external reads never overwrite newer local state.
- **Sources** — `createSourceBinding` binds a source to the coordinator's request lifecycle: it executes exactly the newest request identity, drops completions from released or superseded executions, refuses — before execution, so a refusal costs no round trip — a request the source has not declared support for, holds every count to what the declaration allows, and republishes a later delivery of the same query under a fresh identity so retained rows never carry another request's provenance. It throws at construction when a declared capability has no port to serve it, so a declaration is never a promise the source cannot keep. Construction subscribes to nothing: `observe()` starts and the release it returns stops. `createArraySource` is the default and recommended source — complete local input, so all three of its counts are exact rather than one loaded page's, and it serves record lookup by identity locally. It takes the collection's `schema`, filters each field with the operators its kind accepts, orders by every schema field, runs `defaultSort` when a query states no term of its own, and collates text at the root locale with numeric ordering unless `collation` names another tag. `createQuerySource` runs over an observable query client such as TanStack Query, reached through a structural observer surface so no query library is imported here or forced on consumers. `createRelaySource` runs over a forward-paginating Relay connection through a structural environment surface that Relay's own `Environment` satisfies: each request retains its operation, delivers a page already in the store at once, fetches it, and follows every later store change — a mutation or a local update — so Relay's store stays the only cache. It pages forward from each page's end cursor or from a token the window carries, and refuses — structurally, with `code: "unreachable-page"` — a page it can reach neither way, as after a reload onto page three, instead of inventing one. The query pages by its own `first` and `after` arguments: one paging through `@connection` is refused, since Relay merges such a connection's pages into one list. A missing `totalCount` counts nothing, never zero, and a page with a missing record fails rather than being delivered shorter. `supportsRequest` and `executeSlice` are the pure pieces underneath: the declared-capability check, which returns one structured refusal per unexecutable term, and local execution over complete input in the effective ordering. A control holding the binding reads `binding.supports(query)` before offering a destination — it composes that check with the source's own, which the declaration cannot express — and `binding.capabilities` is the frozen declaration the binding compared, for a source whose own object was never frozen.

Rows are opaque to the core: sources execute request identities and deliver one envelope per page — rows, group summaries, three counts each carrying its own exactness, whether more exists, and page cursors — and they own transport, cache, retry and invalidation through the application's existing query library — this package never runs a competing one. Nothing here knows a data source, a router or the DOM.

## Ordering

Every source declares the order its pages come in, and an empty `slice.sort` means that declared default — never "unordered". The ordering rows are actually in is the group levels, then the query's own terms or the source's default, then the tiebreak the source appends itself. A field appears once; a field spelled twice collapses to its first occurrence in canonicalization, in `setSort` and on decode, so one effective ordering keeps one request identity.

Local execution compares each term through its field's kind:

- **text** through an `Intl.Collator` at the locale the *source* declares — the root collation with numeric ordering by default, so `item2` precedes `item10` — never the viewer's, so a server render, a local execution and a shared link agree. A tag no runtime backs would resolve to the viewer's locale, so it is refused and text compares by code point instead, which is the same everywhere. An empty string carries nothing to order by, so a blank cell goes with the empties rather than ahead of every name;
- **choices** by declared option index, so a status column reads as its lifecycle rather than alphabetically; a value the options do not list orders after every one they do;
- **date** as instants, so a calendar-date string, an ISO-8601 string with `Z` or an offset, a `Date` and epoch milliseconds interleave chronologically. A time of day carrying no offset has no instant: ECMA-262 reads it as local time, which orders one way on a server and another in a browser;
- **flag** false before true, anything present counting as set;
- **number** numerically.

A value the kind has none of — absent, null, a blank cell, or outside its domain — orders after every value that has one, **in both directions**: a reader sorting a column is asking for its values, and the direction is about them.

On the wire a term is `sort=field__direction`, repeated in precedence order. A malformed term, or one naming no field of the schema, refuses the whole ordering with a visible issue; so does an ordering the source cannot execute, whether by field or by arity. Refused means the query runs on the source's default — never truncated, because dropping one term promotes the next into a precedence nobody asked for.

## Saved views

Saved views are local-first and opt-in. The contract — `ViewStore` and the outcome types — is exported from the package root, because types cost no bytes; only the IndexedDB implementation is imported from its own entry point, so an application that keeps no views bundles no storage:

```ts
import { createIndexedDBViewStore } from "@canonical/dataviews-core/views";

const views = createIndexedDBViewStore({
  indexedDB: window.indexedDB,
  database: "operations-console-views", // the store's own database
  collection: "machines",
  partition: accountId, // opaque; never a credential
});
```

Give the store to the provider — `createDataViewsProvider({ schema, capabilities, views })` — and `provider.views` opens, saves, renames and deletes views over it, knows the open one and whether the live query has moved from it, and layers the presentation in force. A provider given no store has `provider.views === null`: no store means no views, never views kept in memory.

The scope — database, collection and partition — is fixed at construction; switching account means disposing the store and constructing another, and one partition never sees another's views. Deleting a previous account's stored views is the application's decision, not an effect of disposing.

- **One saved representation** — a view is a name, the query text with its renderer — stored verbatim, so write it canonical with `encodeQuery({ schema, slice, window: null, preserve: new URLSearchParams("as=table") }).toString()` — optional presentation saved with it, a revision and ISO 8601 timestamps. Opening one reads the text back with `decodeQuery`, which reports any clause the current schema or source refuses rather than executing it, and adopts it on the provider on the first page, keeping the page size. Whether the live query differs from the view is derived by comparing the queries, never stored.
- **Transactional revisions** — `update(view, changes)` and `remove(view)` take the view as last read and succeed only at its revision; anything else is an explicit `conflict` carrying the view as stored now, to reload, save as new, or overwrite by passing it back. Two tabs editing one view conflict rather than one silently winning. `create` takes a caller-minted id, so a creation retried after a lost response finds the view it made instead of duplicating it.
- **Per-preference patches** — pins, the collection's default arrangement and each view's own arrangement are viewer preferences, kept apart from the saved view. `pin(id)` and `unpin(id)` are idempotent. `patchPresentation(target, patch)` takes JSON values — a key patched to `undefined` is removed — and writes each key as its own record, atomically: the last committed write wins for one key only, so two tabs changing different column widths both keep their change. Removing a view removes its pin and its own preferences with it. Patch at the end of an interaction — a resize's commit, not each pointer move — since every patch is a transaction and a notice to every tab.
- **Versioned storage** — the database schema and the record format are both version 1. A record in another format, or one that is malformed, is listed as `unreadable` with its reason and is never overwritten, so an older client never destroys a newer one's data. A database a newer client has upgraded cannot be opened, and says so.
- **Honest failure** — storage the browser blocks, has no room in, or cannot open rejects with the platform's error as `cause`; nothing falls back to memory and claims to have saved. The query and rows stay usable; a failed open is retried by the next call. A read still in flight when the store is disposed rejects; a write that committed still resolves.
- **Across tabs** — `subscribe` hears this tab's writes and, through a `BroadcastChannel` where the platform has one, other tabs'; it says only that something changed, and IndexedDB stays the authority to read again.

A REST-backed store is the application's own: it implements the same `ViewStore` contract, the revision preconditions and per-key patches included, and no REST adapter ships here.

## Records of several types

One collection may hold records of several types — an LXD list of containers
and virtual machines, a Juju list of machines and units. The collection names
one `choices` field of its schema as the discriminator, and every row carries
it:

```ts
const schema = createSchema([
  { field: "type", kind: "choices", options: ["container", "virtual-machine"] },
  { field: "status", kind: "choices", options: ["Running", "Stopped"] },
  {
    field: "secureboot",
    kind: "choices",
    options: ["true", "false"],
    types: ["virtual-machine"],
  },
  { field: "processes", kind: "number", min: 0, types: ["container"] },
]);

const provider = createDataViewsProvider<typeof schema.fields, Instance>({
  schema,
  capabilities: source.capabilities,
  identify: (row) => row.name, // unique across both types
  types: { field: "type" }, // a choices field every Instance carries
});
```

- **Declared, never derived.** A source whose backend sends no such field
  writes it when it builds its rows, as GraphQL servers materialise
  `__typename` and JSON:API requires `type`. A row carrying a value that is
  not one of the field's options fails the completion and is never displayed:
  the rows already on screen stay, reporting `refreshFailed` or `stale` as the
  coordinator does for any other failure, which is the treatment an ambiguous
  identity gets too. The row type is checked against the field's
  options at compile time, and the field's existence at construction.
- **The discriminator is an ordinary field.** It is filtered, sorted and
  grouped under the source's declared capabilities, with no new grammar and no
  reserved name.
- **Scoping and the not-applicable state.** `types` on a field names the
  record types it applies to; absent means every one of them. For a row of
  another type the field is *not applicable* — a third state beside value and
  empty. It satisfies no predicate, `isSet` included, and reads as absent to
  ordering, so filtering on a scoped field restricts the result to that field's
  types by meaning: nothing is added to the query, the URL or a saved view.
  `provider.applicability(field, row)` answers which state a cell is in. This
  rests on the source writing no value at a scoped key for a row the field
  does not apply to — the source's obligation, not something checked here.
- **Identities stay opaque strings**, unique across types within the
  provider's scope and minted by the source, which prefixes with the type only
  where its own backend's identities collide. The UI never parses one.
- **Type memory.** `provider.recordType(id)` answers the type of a selected
  identity, taken while the row was displayed and kept until the rows are next
  replaced after it leaves the selection, so an action's applicability to
  records selected on an earlier page is decidable without a lookup. The row on display always
  answers for itself, so this never contradicts `provider.applicability`, and
  it changes only with a `rows` or a `selection` publication. An identity a
  host restored over rows this provider never modelled while they were
  selected answers null: not loaded, never assumed.

**A monomorphic collection declares no `types`, and none of this reaches it.**
`provider.types` is null, `provider.applicability` answers `"applies"` for
every field, `provider.recordType` answers null, no row is ever read for a
type, and nothing costs anything.

## Words this package uses twice

Two words carry two settled meanings apiece, and both are fixed by decisions older than this package. Neither is renamed; which one is meant is always clear from what holds it.

- **`scope`** is a *collection's* scope on the provider and the coordinator — the generation token that `rotateScope` replaces, so a completion from before the rotation never publishes into after it. It is a *row's* or a *cell's* scope in `createRowScopes` and in the React cell hook — the channels one row, or one cell, observes. It is a *store's* partition in the saved-view store, and a *source's* selection scope in `SourceCapabilities`, meaning whether an action may address a whole query. Four holders, four meanings, no overlap between them.
- **`window`** is the *result* window — the page of a result, `page`, `size`, `cursor` and `collapsed` — everywhere in the query grammar and the source contract. In the React table it is also *row windowing*: mounting only the rows near the viewport. The first is which rows the source is asked for; the second is which of the rows it answered with are in the DOM.

Two smaller conventions, so they are not rediscovered:

- **Every length is in CSS pixels.** `px`, `minPx` and `maxPx` carry the unit in their names; `estimatedRowHeight`, `startWidth` and the rest do not. Pixels are the only unit this package knows, so the suffix says nothing the type does not — it is kept only because renaming it reaches some two hundred places, and it will go when something else is already touching the geometry.
- **`EmptyOr<T>` rather than `T | null`.** A `PredicateOperand` may legally be `null`, so an applied value that is `null` and an applied value that is absent are different facts. The explicit `{ kind: "empty" } | { kind: "value" }` split is the only one that can tell them apart, even though no field kind applies a `null` value today.

## Windowed tables

A table that mounts only the rows near its viewport decides which through `createVirtualRange`, imported from its own entry point, so an application that never windows a table bundles none of it:

```ts
import { createVirtualRange } from "@canonical/dataviews-core/virtualization";
```

The range works over `displayEntries`, from the package root: the entries a table body displays, in order — its status row, then a row per record — each with an id unique across kinds and its logical row position, the header row being 1. It is arithmetic over estimated and measured entry sizes, keyed by entry id: a binding reports the viewport and the measurements, and scrolls by the corrections the range returns. React applications use `virtualRows` from `@canonical/dataviews-react/virtualization` rather than the range itself.
