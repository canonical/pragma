import type { Plugin } from "./types.js";

/**
 * Helper to define a plugin with proper typing (TP.05).
 *
 * This is an identity function that provides type inference
 * and validation for plugin definitions.
 *
 * @example
 * ```ts
 * const myPlugin = definePlugin({
 *   name: "my-plugin",
 *   onQuery(sparql) {
 *     console.log("Query:", sparql);
 *   },
 * });
 * ```
 */
export function definePlugin<P extends Plugin>(plugin: P): P {
  return plugin;
}
