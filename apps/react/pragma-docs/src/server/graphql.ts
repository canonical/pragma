/**
 * The dev GraphQL backend: pragma's knowledge graph compiled to an executable
 * schema, served as a fetch-native handler.
 *
 * The graph sources are the same set the pragma CLI compiles — for each cached
 * source package (design-system, code-standards, anatomy-dsl), every `.ttl`
 * under `definitions/` and `data/`, skipping dot-prefixed entries (editor and
 * channel artifacts such as `.modifier.dark.ttl` are not graph sources, and a
 * dot-prefixed Turtle local name is not even valid RDF). Prefixes are
 * harvested from the Turtle prologues because ke's `createStore` does not fold
 * parsed-Turtle prefixes into `store.prefixes`.
 *
 * The store and schema boot lazily on first request and are shared by every
 * consumer (the Vite middleware, the Bun/Express server bricks), so `vite.config`
 * can import this module without paying the WASM/compile cost at config load.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { createStore, type Plugin } from "@canonical/ke";
import {
  createSchemaPlugin,
  executeLocal,
  type LocalExecutionResult,
  type SchemaPluginApi,
} from "@canonical/ke-graphql";
import { createGraphQLHandler } from "@canonical/ke-graphql/http";

/** The cached source packages whose TTL constitutes the docsite graph. */
const REF_PACKAGES = ["design-system", "code-standards", "anatomy-dsl"];

/** The package subdirectories scanned for `.ttl` sources. */
const TTL_DIRS = ["definitions", "data"];

/** The ref (branch) of each source package the dev backend reads. */
const REF_NAME = "main";

/**
 * A Turtle prefix prologue declaration (`@prefix ex: <iri> .` or the
 * case-insensitive keyword form). The label group requires at least one
 * character so the default-namespace form (`@prefix : <iri>`) is skipped.
 */
const PREFIX_DECL = /(?:^|\s)@?prefix\s+([^\s:]+):\s*<([^>]*)>/gi;

/** The emitted SDL destination — the file relay-compiler reads. */
const SDL_OUTPUT_PATH = fileURLToPath(
  new URL("../relay/schema.graphql", import.meta.url),
);

interface TtlSource {
  readonly path: string;
  readonly content: string;
}

/**
 * A channel-dotted local name reference (`ds:.subcomponent.accordion-item`):
 * a valid IRI but invalid Turtle, since a PN_LOCAL may not start with an
 * unescaped dot. Public data files reference experimental-channel entities
 * this way (the entities' own dot-prefixed files are excluded as sources), so
 * the reference is escaped (`ds:\.foo` — same IRI) rather than dropped; the
 * dangling target then reads as honest absence in the graph.
 */
const CHANNEL_DOTTED_REF = /\b([A-Za-z][\w-]*):\.(?=[A-Za-z_])/g;

/** Escape channel-dotted local names so strict Turtle parsers accept them. */
const escapeChannelDottedRefs = (content: string): string =>
  content.replace(CHANNEL_DOTTED_REF, "$1:\\.");

/** The refs root: `$PRAGMA_REFS_DIR` or the pragma CLI's cache location. */
const resolveRefsRoot = (): string =>
  process.env.PRAGMA_REFS_DIR ??
  join(homedir(), ".cache", "pragma", "refs", "@canonical");

/** Recursively collect `*.ttl` files under a directory, skipping dotfiles. */
const walkTtl = (
  dir: string,
  base: string,
  label: string,
  out: TtlSource[],
): void => {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walkTtl(full, base, label, out);
    } else if (entry.isFile() && entry.name.endsWith(".ttl")) {
      out.push({
        path: `${label}/${relative(base, full)}`,
        content: escapeChannelDottedRefs(readFileSync(full, "utf-8")),
      });
    }
  }
};

/**
 * Collect every TTL source across the configured ref packages.
 *
 * @note Impure — reads the pragma CLI's source cache from disk.
 */
const collectTtlSources = (): TtlSource[] => {
  const refsRoot = resolveRefsRoot();
  if (!existsSync(refsRoot)) {
    throw new Error(
      `pragma refs cache not found at ${refsRoot} — run \`pragma sources update\` (or set PRAGMA_REFS_DIR).`,
    );
  }
  const sources: TtlSource[] = [];
  for (const pkg of REF_PACKAGES) {
    const root = join(refsRoot, pkg, REF_NAME);
    for (const sub of TTL_DIRS) {
      walkTtl(join(root, sub), root, pkg, sources);
    }
  }
  if (sources.length === 0) {
    throw new Error(
      `no .ttl sources found under ${refsRoot} — run \`pragma sources update\`.`,
    );
  }
  sources.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  return sources;
};

/** Merge every prefix declared in the sources' Turtle prologues. */
const harvestPrefixes = (
  sources: readonly TtlSource[],
): Record<string, string> => {
  const prefixes: Record<string, string> = {};
  for (const source of sources) {
    for (const match of source.content.matchAll(PREFIX_DECL)) {
      const [, label, iri] = match;
      if (label && iri) prefixes[label] = iri;
    }
  }
  return prefixes;
};

/**
 * Arguments for {@link GraphqlBackend.execute}: query *text* plus values.
 *
 * Deliberately narrower than ke-graphql's `ExecuteLocalArgs` — no `document`
 * member exists here, and none is ever forwarded. Two graphql versions
 * coexist in this process (the app's v16, ke-graphql's pinned v17 RC), which
 * is safe only while the boundary is text-only: a pre-parsed AST built by the
 * app's graphql 16 must never cross into the v17 executor.
 */
export interface GraphqlExecuteArgs {
  readonly source: string;
  readonly variableValues?: Record<string, unknown> | null;
  readonly operationName?: string | null;
}

export interface GraphqlBackend {
  readonly handle: (request: Request) => Promise<Response>;
  readonly api: SchemaPluginApi;
  /**
   * Execute a query in-process — no HTTP hop, no serialization. Binds
   * `executeLocal` to the booted store with a fresh context per call
   * (ke-graphql contexts must not be retained across requests).
   */
  readonly execute: (args: GraphqlExecuteArgs) => Promise<LocalExecutionResult>;
}

/**
 * Boot the store, compile the schema, and build the fetch handler.
 *
 * @note Impure — reads the source cache, boots an Oxigraph WASM store, and
 * writes the emitted SDL to `src/relay/schema.graphql` for relay-compiler.
 */
const bootGraphqlBackend = async (): Promise<GraphqlBackend> => {
  const sources = collectTtlSources();
  const prefixes = harvestPrefixes(sources);
  const graphql = createSchemaPlugin({
    incremental: true,
    sdlOutput: SDL_OUTPUT_PATH,
  });
  // biome-ignore lint: Plugin generic variance requires explicit unknown
  const plugins: Plugin<any>[] = [graphql];
  const store = await createStore({
    sources: sources.map((source) => ({
      content: source.content,
      path: source.path,
    })),
    prefixes,
    plugins,
  });
  const api = store.api<SchemaPluginApi>("ke-graphql");
  if (!api) {
    throw new Error("ke-graphql plugin did not register its API");
  }
  const handle = createGraphQLHandler(api.schema, {
    context: () => api.createContext(store),
    graphiql: true,
    cors: true,
    incremental: true,
  });
  // Members are passed one by one (never spread) so a caller-smuggled
  // `document` AST can never reach executeLocal — see GraphqlExecuteArgs.
  const execute = (args: GraphqlExecuteArgs): Promise<LocalExecutionResult> =>
    executeLocal({
      schema: api.schema,
      contextValue: api.createContext(store),
      source: args.source,
      variableValues: args.variableValues,
      operationName: args.operationName,
    });
  console.info(
    `[graphql] schema compiled from ${sources.length} TTL sources (${api.diagnostics.length} diagnostics) — SDL written to ${relative(process.cwd(), SDL_OUTPUT_PATH)}`,
  );
  return { handle, api, execute };
};

let backendPromise: Promise<GraphqlBackend> | undefined;

/**
 * The shared lazy backend singleton — boots on first call. A failed boot is
 * forgotten so the next request retries instead of serving the cached
 * rejection forever.
 */
export const getGraphqlBackend = (): Promise<GraphqlBackend> => {
  backendPromise ??= bootGraphqlBackend().catch((error: unknown) => {
    backendPromise = undefined;
    throw error;
  });
  return backendPromise;
};
