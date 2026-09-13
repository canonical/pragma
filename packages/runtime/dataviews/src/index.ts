/**
 * @canonical/dataviews-core — collection-views core for Canonical apps:
 * the collection declared once at module scope — schema, record identity,
 * record types — the bounded query grammar with addressed commands and
 * window projection, the filter and action-run records, the query
 * coordinator owning query/window coherence and the request lifecycle, the
 * `QueryLocation` port and its adapters, the flat URL query grammar,
 * observation channels and explicit-ID selection, the provider that owns
 * its source, location and saved-view ports, and the source contract with
 * its local-array, observable-query-client and Relay forward-connection
 * sources. React/Svelte bindings are wired above this layer; nothing here
 * touches the DOM, a data source, a query library or a router directly
 * (the platform location adapter and the query and Relay sources compose
 * structural host surfaces instead).
 *
 * @packageDocumentation
 */

export * from "./lib/index.js";
