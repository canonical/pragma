/**
 * Unified boot path for pragma CLI, MCP, and completions server.
 *
 * `bootPragma()` is the single factory function that creates a
 * `PragmaRuntime`. All three surfaces (CLI, MCP, completions) call it
 * instead of manually assembling store + config.
 *
 * @note Impure — reads config from filesystem and boots ke store (WASM + TTL).
 */

import type { SourceSpec, Store } from "@canonical/ke";
import {
  CompilationError,
  compile,
  createStoreQueryFn,
} from "@canonical/ke-graphql";
import { readConfigLayers } from "#config";
import { PragmaError } from "#error";
import { bootStore } from "./bootStore.js";
import { mergeAndParseRefs } from "./mergeAndParseRefs.js";
import type { PragmaGraphqlApi, PragmaRuntime } from "./types/index.js";

export type { PragmaGraphqlApi, PragmaRuntime } from "./types/index.js";

/**
 * Create a fully initialized `PragmaRuntime`.
 *
 * Reads config from `cwd` (defaults to `process.cwd()`), merges global
 * and project package refs, boots the ke store from resolved sources,
 * and returns a runtime ready for operation calls.
 *
 * The caller owns the lifecycle and must call `dispose()`.
 *
 * @param options.cwd - Working directory for config and source resolution.
 * @param options.sources - Override sources for testing (skip filesystem resolution).
 * @throws PragmaError with code CONFIG_ERROR if config is invalid.
 * @throws PragmaError with code STORE_ERROR if store fails to initialize.
 */
export async function bootPragma(options?: {
  cwd?: string;
  sources?: SourceSpec[];
}): Promise<PragmaRuntime> {
  const cwd = options?.cwd ?? process.cwd();
  const { config, origins } = readConfigLayers(cwd);

  // Merge package refs: a non-empty config list replaces global refs and
  // defaults; otherwise global refs merge over the defaults.
  const refs = options?.sources
    ? undefined
    : mergeAndParseRefs(config.packages);

  const { store, packages } = await bootStore({
    cwd,
    sources: options?.sources,
    refs,
    trace: config.trace,
    prefixes: config.prefixes,
  });

  return {
    store,
    config,
    origins,
    cwd,
    packages,
    graphql: createLazyGraphql(store),
    dispose: () => store.dispose(),
  };
}

/**
 * Create the runtime's lazy, memoized `graphql()` accessor for a store.
 *
 * Compilation is measured at ~210 ms against the live graph (vs ~250 ms for
 * the whole store boot), so it must never run on the boot path of commands
 * that don't use GraphQL. The store is immutable after boot, so a single
 * compile serves the runtime's lifetime; a failed compile is deterministic
 * for the loaded sources and stays cached too.
 *
 * @note Impure — the returned accessor compiles against the store on first
 *   call.
 */
export function createLazyGraphql(
  store: Store,
): () => Promise<PragmaGraphqlApi> {
  let graphqlApi: Promise<PragmaGraphqlApi> | undefined;
  return () => {
    graphqlApi ??= compileGraphqlApi(store);
    return graphqlApi;
  };
}

/**
 * Compile the OWL-derived GraphQL schema from an already-booted store.
 *
 * Runs the ke-graphql pipeline directly against the live store (the same
 * compiler `createSchemaPlugin` runs at boot for the dev server), so no
 * plugin needs to be attached at store creation and non-GraphQL commands
 * pay nothing.
 *
 * @throws PragmaError with code STORE_ERROR when schema composition fails,
 *   carrying the compiler's error diagnostics and a `pragma graphql check`
 *   recovery.
 * @note Impure — executes SPARQL extraction queries against the store.
 */
async function compileGraphqlApi(store: Store): Promise<PragmaGraphqlApi> {
  try {
    const result = await compile(createStoreQueryFn(store), store.prefixes);
    return { schema: result.schema, createContext: result.createContext };
  } catch (error) {
    if (error instanceof CompilationError) {
      const details = error.diagnostics
        .filter((d) => d.severity === "error")
        .map((d) => `${d.code}: ${d.message}`)
        .slice(0, 3)
        .join("; ");
      throw PragmaError.storeError(
        `GraphQL schema compilation failed: ${details || error.message}`,
        {
          recovery: {
            message: "Inspect the full compiler diagnostics.",
            cli: "pragma graphql check",
          },
        },
      );
    }
    throw error;
  }
}
