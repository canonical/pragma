// =============================================================================
// ke plugin entry: onReady runs the compiler against the freshly loaded
// store; onReload recompiles (note: with `cache:` configured, ke's reload()
// short-circuits on a cache hit — pass { force: true } in dev flows).
//
// Failure policy: the schema is produced even through non-composition
// errors (the tsc model — diagnostics never abort the pipeline); only a
// CompilationError (composition failed) propagates and fails the boot. All
// diagnostics are logged either way.
// =============================================================================

import { readFileSync, writeFileSync } from "node:fs";
import { definePlugin, type PluginContext, type SPARQL } from "@canonical/ke";
import {
  compile,
  compileFromExtraction,
  type Diagnostic,
  deserializeExtraction,
  hashSources,
  type QueryFn,
  type SchemaPluginApi,
  type SchemaPluginOptions,
  type SerializedExtraction,
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

/** Plugin-only options on top of SchemaPluginOptions. */
export interface SchemaPluginExtra {
  /**
   * Precomputed extraction artifact (path or parsed) — boots the schema
   * without Pass 1 when its sourcesHash matches the loaded TTL; falls back
   * to a live compile (with a warning) when stale.
   */
  extraction?: string | SerializedExtraction;
}

/**
 * Create the ke-graphql schema plugin: compiles the schema when the store is
 * ready and recompiles on reload, registering the SchemaPluginApi under
 * "ke-graphql".
 *
 * @note Impure — the plugin's lifecycle hooks query the store, may read the
 * extraction artifact from disk, and may write the SDL output file.
 *
 * @example
 * ```ts
 * const graphql = createSchemaPlugin({ mappings, extensions });
 * const store = await createStore({ sources, prefixes, plugins: [graphql] });
 * const { schema, createContext } = store.api<SchemaPluginApi>("ke-graphql")!;
 * ```
 */
export default function createSchemaPlugin(
  options: SchemaPluginOptions & SchemaPluginExtra = {},
) {
  // Fingerprint the TTL sources as ke loads them — artifact freshness check.
  const sourceContents: string[] = [];
  return definePlugin<SchemaPluginApi>({
    name: "ke-graphql",

    onLoad(source) {
      sourceContents.push(source.content);
    },

    async onReady(ctx) {
      return compileForContext(ctx, options, sourceContents);
    },

    async onReload(ctx) {
      return compileForContext(ctx, options, sourceContents);
    },
  });
}

/**
 * Compile for a plugin lifecycle hook: boot from the extraction artifact
 * when fresh, fall back to a live compile otherwise, then log diagnostics
 * and write the SDL output when configured.
 *
 * @note Impure — reads the extraction artifact from disk, executes SPARQL
 * queries on a live compile, logs to the console, and writes the SDL output
 * file when configured.
 */
const compileForContext = async (
  ctx: PluginContext,
  options: SchemaPluginOptions & SchemaPluginExtra,
  sourceContents: string[],
): Promise<SchemaPluginApi> => {
  let result: Awaited<ReturnType<typeof compile>> | undefined;

  if (options.extraction !== undefined) {
    const artifact =
      typeof options.extraction === "string"
        ? (JSON.parse(
            readFileSync(options.extraction, "utf-8"),
          ) as SerializedExtraction)
        : options.extraction;
    const { sourcesHash } = deserializeExtraction(artifact);
    const loadedHash = hashSources(sourceContents);
    if (sourcesHash === loadedHash) {
      result = compileFromExtraction(artifact, options);
    } else {
      console.warn(
        `[ke-graphql] extraction artifact is stale (artifact ${sourcesHash}, sources ${loadedHash}) — falling back to a live compile. Regenerate it (pragma graphql build).`,
      );
    }
  }

  result ??= await compile(createPluginQueryFn(ctx), ctx.prefixes, options);
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
