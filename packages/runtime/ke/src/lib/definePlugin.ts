// =============================================================================
// @canonical/ke — Plugin definition helper
//
// An identity function that provides type inference for plugin definitions.
// It doesn't transform the input — it exists solely so TypeScript can infer
// and validate the Plugin interface at the call site without an explicit
// type annotation.
//
// Without definePlugin:
//   const plugin: Plugin = { name: "foo", onQuery(s) { ... } }  // manual annotation
//
// With definePlugin:
//   const plugin = definePlugin({ name: "foo", onQuery(s) { ... } })  // inferred
//
// The generic <P extends Plugin> ensures that the returned type preserves
// the specific shape of the input (e.g., which hooks are defined), which
// can be useful for downstream type narrowing.
// =============================================================================

import type { Plugin } from "./types.js";

/**
 * Define a ke plugin with type inference.
 *
 * This is a type-only helper — it returns the plugin object unchanged.
 * Use it to get autocompletion and type checking for plugin definitions
 * without manually annotating the Plugin type.
 *
 * @example
 * ```ts
 * const loggingPlugin = definePlugin({
 *   name: "logger",
 *   onLoad(source) {
 *     console.log(`Loading: ${source.path}`);
 *   },
 *   onQuery(sparql) {
 *     console.log(`Query: ${sparql.slice(0, 100)}`);
 *     // Return void — query passes through unchanged
 *   },
 *   onResult(result) {
 *     console.log(`Result: ${result.type}, ${
 *       result.type === "select" ? result.bindings.length + " rows" : ""
 *     }`);
 *     // Return void — result passes through unchanged
 *   },
 * });
 *
 * const store = await createStore({
 *   sources: ["./data.ttl"],
 *   plugins: [loggingPlugin],
 * });
 * ```
 */
export default function definePlugin<P extends Plugin>(plugin: P): P {
  return plugin;
}
