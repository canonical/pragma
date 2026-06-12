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
import { compile } from "./compiler/index.js";
import type {
  Diagnostic,
  QueryFn,
  SchemaPluginApi,
  SchemaPluginOptions,
} from "./compiler/types.js";

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

const pluginQueryFn =
  (ctx: PluginContext): QueryFn =>
  (query) =>
    ctx.query(query as SPARQL<string>);

/**
 * Create the ke-graphql schema plugin.
 *
 * @example
 * ```ts
 * const graphql = createSchemaPlugin({ mappings, extensions });
 * const store = await createStore({ sources, prefixes, plugins: [graphql] });
 * const { schema, createContext } = store.api<SchemaPluginApi>("ke-graphql")!;
 * ```
 */
export const createSchemaPlugin = (options: SchemaPluginOptions = {}) =>
  definePlugin<SchemaPluginApi>({
    name: "ke-graphql",

    async onReady(ctx) {
      return compileForContext(ctx, options);
    },

    async onReload(ctx) {
      return compileForContext(ctx, options);
    },
  });

const compileForContext = async (
  ctx: PluginContext,
  options: SchemaPluginOptions,
): Promise<SchemaPluginApi> => {
  const result = await compile(pluginQueryFn(ctx), ctx.prefixes, options);
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
  };
};
