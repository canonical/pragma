// =============================================================================
// ke plugin entry (§9): onReady runs the compiler against the freshly loaded
// store; onReload recompiles (note: with `cache:` configured, ke's reload()
// short-circuits on a cache hit — pass { force: true } in dev flows).
//
// Failure policy: the schema is produced through non-composition errors
// (§2.2); only a CompilationError (composition failed) propagates and fails
// the boot. All diagnostics are logged either way.
// =============================================================================

import { writeFileSync } from "node:fs";
import { definePlugin, type PluginContext, type SPARQL } from "@canonical/ke";
import {
  compile,
  type Diagnostic,
  type QueryFn,
  type SchemaPluginApi,
  type SchemaPluginOptions,
} from "./compiler/index.js";

/**
 * Log every diagnostic to the console at its severity's channel.
 *
 * @note Impure — writes to the console.
 */
const logDiagnostics = (diagnostics: Diagnostic[]): void => {
  for (const d of diagnostics) {
    const line = `[ke-graphql] ${d.code}: ${d.message}${d.source ? ` (${d.source})` : ""}`;
    if (d.severity === "error") {
      console.error(line);
    } else if (d.severity === "warning") {
      console.warn(line);
    } else {
      console.info(line);
    }
  }
};

/**
 * Adapt a ke PluginContext to the QueryFn surface (string → branded SPARQL).
 *
 * @note Impure — the returned function executes SPARQL queries against the
 * store behind the plugin context.
 */
const createPluginQueryFn =
  (ctx: PluginContext): QueryFn =>
  (query) =>
    ctx.query(query as SPARQL<string>);

/**
 * Create the ke-graphql schema plugin: compiles the schema when the store is
 * ready and recompiles on reload, registering the SchemaPluginApi under
 * "ke-graphql".
 *
 * @note Impure — the plugin's lifecycle hooks query the store and may write
 * the SDL output file.
 *
 * @example
 * ```ts
 * const graphql = createSchemaPlugin({ mappings, extensions });
 * const store = await createStore({ sources, prefixes, plugins: [graphql] });
 * const { schema, createContext } = store.api<SchemaPluginApi>("ke-graphql")!;
 * ```
 */
export default function createSchemaPlugin(options: SchemaPluginOptions = {}) {
  return definePlugin<SchemaPluginApi>({
    name: "ke-graphql",

    async onReady(ctx) {
      return compileForContext(ctx, options);
    },

    async onReload(ctx) {
      return compileForContext(ctx, options);
    },
  });
}

/**
 * Compile for a plugin lifecycle hook: run a live compile, then log
 * diagnostics and write the SDL output when configured.
 *
 * @note Impure — executes SPARQL queries on the store, logs to the console,
 * and writes the SDL output file when configured.
 */
const compileForContext = async (
  ctx: PluginContext,
  options: SchemaPluginOptions,
): Promise<SchemaPluginApi> => {
  const result = await compile(createPluginQueryFn(ctx), ctx.prefixes, options);
  logDiagnostics(result.diagnostics);

  if (options.sdlOutput) {
    writeFileSync(options.sdlOutput, result.sdl, "utf-8");
  }

  return {
    schema: result.schema,
    diagnostics: result.diagnostics,
    nameMap: result.nameMap,
    sdl: result.sdl,
    createContext: result.createContext,
    clearLoaderCache: result.clearLoaderCache,
  };
};
