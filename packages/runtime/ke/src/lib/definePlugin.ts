// =============================================================================
// @canonical/ke — Plugin definition helper
//
// An identity function that provides type inference for plugin definitions.
// It doesn't transform the input — it exists solely so TypeScript can infer
// and validate the Plugin interface at the call site without an explicit
// type annotation.
//
// Without definePlugin:
//   const plugin: Plugin<MyApi> = { name: "foo", onReady(ctx) { ... } }
//
// With definePlugin:
//   const plugin = definePlugin<MyApi>({ name: "foo", onReady(ctx) { ... } })
//
// The TApi generic flows through to Plugin<TApi>, enabling type-safe API
// exposure via store.api<TApi>("pluginName"). Defaults to void for plugins
// that don't expose an API.
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
 * // Plugin without API (TApi defaults to void)
 * const loggingPlugin = definePlugin({
 *   name: "logger",
 *   onLoad(source, ctx) {
 *     console.log(`Loading: ${source.path}`);
 *   },
 * });
 *
 * // Plugin with typed API
 * interface MyApi { getCount(): number }
 * const myPlugin = definePlugin<MyApi>({
 *   name: "my-plugin",
 *   onReady(ctx) {
 *     return { getCount: () => 42 };
 *   },
 * });
 *
 * const store = await createStore({
 *   sources: ["./data.ttl"],
 *   plugins: [loggingPlugin, myPlugin],
 * });
 * const api = store.api<MyApi>("my-plugin");
 * ```
 */
export default function definePlugin<TApi = void>(
  plugin: Plugin<TApi>,
): Plugin<TApi> {
  return plugin;
}
