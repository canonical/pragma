/**
 * @canonical/dataviews-core — collection-views core for Canonical apps:
 * runtime identity tokens, the bounded query grammar with addressed commands
 * and window projection, field interaction, operation and save-race records,
 * the collection coordinator owning query/window coherence and the request
 * lifecycle, the Location port and its adapters, the flat URL query grammar
 * and the authority loop binding a Location to a provider, the
 * schema/observation layer — field definitions with inferred types and
 * enforced semantics, observation channels and explicit-ID selection — and
 * the source adapter contract with its local-array, observable-query-client
 * and Relay forward-connection adapters. React/Svelte bindings are wired
 * above this layer; nothing here touches the DOM, a data source, a query
 * library or a router directly (the platform Location adapter and the query
 * and Relay sources compose structural host surfaces instead).
 *
 * @packageDocumentation
 */

export * from "./lib/index.js";
