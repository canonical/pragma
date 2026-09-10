/**
 * @canonical/dataviews-core — collection-views core for Canonical apps:
 * runtime identity tokens, the bounded query grammar with addressed
 * commands and window projection, field interaction, operation and
 * save-race records, the collection coordinator owning query/window
 * coherence and the request lifecycle, the Location port and its adapters,
 * and the schema/observation layer — field definitions with inferred types
 * and enforced semantics, observation channels and explicit-ID selection.
 * React/Svelte bindings are wired above this layer; nothing here touches
 * the DOM, a data source, or a router directly (the platform Location
 * adapter composes a structural host surface).
 *
 * @packageDocumentation
 */

export * from "./lib/index.js";
