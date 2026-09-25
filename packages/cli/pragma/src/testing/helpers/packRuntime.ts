/**
 * Test helper: build a store-backed {@link PragmaRuntime} from inline TTL.
 *
 * Compiles a pack from the fixture graph (the ONE place the live 7-pass compile
 * runs), then wires a lazy store + query facade over it — the same seam the
 * dispatcher uses, so compiled pack verbs run exactly as in production. Used by
 * the pack compiler, disclosure, and block/standard parity suites.
 */

import type { DetailLevel } from "../../constants.js";
import { VERSION } from "../../constants.js";
import type { ConfigLayers, ConfigOrigin } from "../../kernel/config/types.js";
import { createQueryFacade } from "../../kernel/runtime/facade.js";
import { buildPack } from "../../kernel/runtime/graphpack/build.js";
import { readPack } from "../../kernel/runtime/graphpack/read.js";
import type {
  GlobalFlags,
  LazyStore,
  PragmaRuntime,
  StoreSession,
} from "../../kernel/runtime/types.js";

/** Neutral flags for a plain-text, non-agent fixture invocation. */
const FIXTURE_FLAGS: GlobalFlags = {
  llm: false,
  autoLlm: false,
  format: "plain",
  verbose: false,
};

/** Options for {@link buildFixtureRuntime}. */
export interface FixtureRuntimeOptions {
  /** Inline TTL for the fixture graph (ontology + individuals). */
  readonly ttl: string;
  /** The prefixes the store is built and queried with. */
  readonly prefixes: Readonly<Record<string, string>>;
  /** Explicit `--detail` level for this invocation. */
  readonly detail?: DetailLevel;
  /** Config `detail` value and its origin (drives {@link resolvePackDetail}). */
  readonly configDetail?: DetailLevel;
  /** Origin of the config `detail` (default `"default"`). */
  readonly detailOrigin?: ConfigOrigin;
}

/** A built fixture runtime plus the lazy store handle (to inspect `booted`). */
export interface FixtureRuntime {
  readonly rt: PragmaRuntime;
  readonly store: LazyStore;
}

/**
 * Build a runtime backed by a pack compiled from inline TTL.
 *
 * @param options - The fixture graph, prefixes, and disclosure inputs.
 * @returns The runtime and its lazy store.
 * @note Impure — writes a content-addressed pack under the isolated XDG cache.
 */
export async function buildFixtureRuntime(
  options: FixtureRuntimeOptions,
): Promise<FixtureRuntime> {
  const built = await buildPack(
    [{ path: "fixture.ttl", content: options.ttl }],
    {
      name: "pack-fixture",
      version: "0.0.0",
      sourceRef: "test:inline",
      prefixes: options.prefixes,
    },
  );

  // MEMOIZED like the production handle (`createLazyStore`), on purpose: the
  // facade calls `store.get()` for every query, and this runtime's verbs run
  // dozens of queries per suite — an unmemoized `get()` booted a fresh
  // oxigraph store, ke-GraphQL compile, and index parse PER VERB CALL, and the
  // suites' `afterAll` dispose then removed a session nobody had used. One
  // session per runtime is also what makes `dispose()` in a suite's `afterAll`
  // dispose the store the suite actually ran on — under worker reuse an
  // undisposed session is native memory that outlives the file.
  let sessionPromise: Promise<StoreSession> | undefined;
  let booted = false;
  const store: LazyStore = {
    get booted() {
      return booted;
    },
    async get() {
      sessionPromise ??= readPack(built.dir).then(
        (session) => {
          booted = true;
          return session;
        },
        (error: unknown) => {
          // Never memoize a rejection: a re-`get()` after a failed boot starts
          // over, the same contract `createLazyStore` gives the MCP server.
          sessionPromise = undefined;
          throw error;
        },
      );
      return sessionPromise;
    },
    invalidate() {
      sessionPromise = undefined;
      booted = false;
    },
  };

  const layers: ConfigLayers = {
    config: {
      channel: "normal",
      ...(options.configDetail !== undefined
        ? { detail: options.configDetail }
        : {}),
    },
    origins: {
      tier: "default",
      channel: "default",
      detail: options.detailOrigin ?? "default",
      packs: "default",
      stories: "default",
      prefixes: "default",
    },
    global: { path: "", exists: false },
    project: { exists: false },
  };

  const rt: PragmaRuntime = {
    cwd: process.cwd(),
    version: VERSION,
    globalFlags: {
      ...FIXTURE_FLAGS,
      ...(options.detail !== undefined ? { detail: options.detail } : {}),
    },
    loadConfig: async () => layers,
    store,
    query: createQueryFacade(store),
  };

  return { rt, store };
}
