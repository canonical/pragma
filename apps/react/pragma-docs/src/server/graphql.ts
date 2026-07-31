/**
 * The dev GraphQL backend: pragma's knowledge graph compiled to an executable
 * schema, served as a fetch-native handler.
 *
 * The graph compiles from TWO roots into ONE store:
 *
 * 1. the pragma CLI's refs cache — for each cached source package
 *    (design-system, code-standards, anatomy-dsl), every `.ttl` under
 *    `definitions/` and `data/`;
 * 2. the semantics working tree — the `surface` ontology and the
 *    `design-system-docs` graph that instantiates it: the docsite's own
 *    demand model (jobs, coordinates, pairings, surfaces, layouts), which
 *    the journeys lens reads.
 *
 * Both roots skip dot-prefixed entries (editor and channel artifacts such as
 * `.modifier.dark.ttl` are not graph sources, and a dot-prefixed Turtle local
 * name is not even valid RDF). Prefixes are harvested from the Turtle
 * prologues because ke's `createStore` does not fold parsed-Turtle prefixes
 * into `store.prefixes`.
 *
 * The merge is PURELY ADDITIVE — no pre-merge type loses a field and only
 * `Query` widens — which `graphqlSources.tests.ts` pins against a captured
 * copy of the pre-merge SDL. The second root is skipped entirely when the
 * semantics tree is absent, so the four shipped lenses still boot without it.
 *
 * Since the PRD-3 process split this module has exactly ONE consumer:
 * `graph.ts`, the standalone graph server. Nothing in the web servers, the
 * render world, or `vite.config` imports it any more — which is the whole
 * point, because it is what keeps the Oxigraph WASM store and ke-graphql's
 * pinned graphql v17 RC out of every other process. The boot is still lazy
 * (`getGraphqlBackend` memoises), but `graph.ts` triggers it eagerly at
 * startup so "listening" means "schema compiled".
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { createStore, type Plugin } from "@canonical/ke";
import {
  createSchemaPlugin,
  type SchemaPluginApi,
} from "@canonical/ke-graphql";
import { createGraphQLHandler } from "@canonical/ke-graphql/http";

/** The cached source packages whose TTL constitutes the docsite graph. */
const REF_PACKAGES = ["design-system", "code-standards", "anatomy-dsl"];

/**
 * The SECOND source root: the semantic packages that carry the docsite's
 * own demand model — the surface ontology (jobs, coordinates, pairings,
 * surfaces, layouts) and the docs graph that instantiates it. These live
 * in the semantics working tree rather than the pragma CLI's refs cache,
 * so they are collected from their own root and merged into the same
 * store: one schema, two roots.
 *
 * Compiling them alongside the refs packages is purely additive — no
 * existing type loses a field and no prefix collides (`sem://surface#Job`
 * yields `Job`, `sem://design-system-docs#` its own block).
 */
const SEM_PACKAGES = ["surface", "design-system-docs"];

/** The package subdirectories scanned for `.ttl` sources. */
const TTL_DIRS = ["definitions", "data"];

/**
 * Sources excluded from the semantic root.
 *
 * `shim-concept.ttl` declares `ds:embodiesConcept` with `rdfs:domain
 * ds:Entity`. Because `ds:Entity` is the root of the design-system class
 * tree, that one domain assertion smears the property (and its inverse)
 * onto ALL FOURTEEN `ds:` types once both roots compile together — every
 * existing docsite type would silently gain two fields, and `Concept`
 * would gain a malformed single-character field. The shim is a modelling
 * bridge for a graph the docsite does not read; excluding it keeps the
 * second root additive-only, which `graphqlSources.tests.ts` pins by
 * asserting `Component` still carries exactly its established field count
 * (restore the shim and that suite fails — verified, not assumed).
 */
const EXCLUDED_SOURCES = ["design-system-docs/data/shim-concept.ttl"];

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

/** The semantics root: `$PRAGMA_SEM_DIR` or the sibling working tree. */
const resolveSemRoot = (): string =>
  process.env.PRAGMA_SEM_DIR ?? join(homedir(), "code", "cn", "semantics");

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
  const semRoot = resolveSemRoot();
  if (existsSync(semRoot)) {
    for (const pkg of SEM_PACKAGES) {
      const root = join(semRoot, pkg);
      for (const sub of TTL_DIRS) {
        walkTtl(join(root, sub), root, pkg, sources);
      }
    }
  }
  const collected = sources.filter(
    (source) => !EXCLUDED_SOURCES.includes(source.path),
  );
  collected.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  return collected;
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
 * The booted backend: a fetch-native handler plus the compiled schema's API.
 *
 * There is no in-process `execute` member any more. It existed so the SSR
 * prepare step could skip the HTTP hop, and it was the reason a pre-parsed
 * AST from the app's graphql v16 had to be kept away from ke-graphql's v17
 * executor. The prepare step now POSTs over HTTP like any other client, so
 * the two graphql versions no longer share a process at all and the whole
 * text-only-boundary discipline is moot.
 */
export interface GraphqlBackend {
  readonly handle: (request: Request) => Promise<Response>;
  readonly api: SchemaPluginApi;
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
  console.info(
    `[graphql] schema compiled from ${sources.length} TTL sources (${api.diagnostics.length} diagnostics) — SDL written to ${relative(process.cwd(), SDL_OUTPUT_PATH)}`,
  );
  return { handle, api };
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
