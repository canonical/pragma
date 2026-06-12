// =============================================================================
// ke plugin entry (§9): onReady runs the compiler against the freshly loaded
// store; onReload recompiles (note: with `cache:` configured, ke's reload()
// short-circuits on a cache hit — pass { force: true } in dev flows).
//
// Failure policy: the schema is produced through non-composition errors
// (§2.2); only a CompilationError (composition failed) propagates and fails
// the boot. All diagnostics are logged either way.
// =============================================================================

import { readFileSync, writeFileSync } from "node:fs";
import { definePlugin, type PluginContext, type SPARQL } from "@canonical/ke";
import {
  deserializeExtraction,
  hashSources,
  type SerializedExtraction,
} from "./compiler/artifact.js";
import { compile, compileFromExtraction } from "./compiler/index.js";
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
export interface SchemaPluginExtra {
  /**
   * Precomputed extraction artifact (path or parsed) — boots the schema
   * without Pass 1 when its sourcesHash matches the loaded TTL; falls back
   * to a live compile (with a warning) when stale.
   */
  extraction?: string | SerializedExtraction;
}

export const createSchemaPlugin = (
  options: SchemaPluginOptions & SchemaPluginExtra = {},
) => {
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
};

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

  result ??= await compile(pluginQueryFn(ctx), ctx.prefixes, options);
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
