// =============================================================================
// The pragma provider: TTL corpus → Oxigraph store → executable schema →
// fetch-native handler.
//
// -----------------------------------------------------------------------------
// IMPLEMENTER DECISION 1 (plan OQ-5): `sdlOutput` is OPTIONAL, and its absence
// means NO WRITE. It has no default and this package never derives one.
//
// The alternative — making it REQUIRED, so omitting it is a type error — is a
// stronger guard against the specific accident this shape exists to prevent
// (see below), and it was a close call. It was rejected because it forces
// `demo/server.ts` to invent an SDL path it does not want, and inventing a
// path is precisely the failure being designed out: a provider that must name
// a file has to have an opinion about where the consumer's source tree is.
// Optional-no-write means the default behaviour of this package is to write
// nothing, anywhere, ever, which is the safest possible default and the one
// that needs no reviewer to check it.
//
// THE ACCIDENT IT PREVENTS. The app's former `src/server/graphql.ts` derived
// the path itself:
//
//     const SDL_OUTPUT_PATH = fileURLToPath(
//       new URL("../relay/schema.graphql", import.meta.url),
//     );
//
// Carried into this package unchanged, that resolves relative to THIS file —
// so the app's schema would be written into `packages/docsite/pragma-provider/`
// (or into `node_modules/`), `tsc --noEmit` would pass, `biome check` would
// pass, and every test in the repo would pass. Only a boot reveals it, and a
// boot needs a populated refs cache. The guard is therefore structural, not a
// test: there is no path in this package to get wrong. The consumer passes one
// or nothing happens. `createPragmaProvider.test.ts` covers both branches, and
// the boot log names the resolved path so a live run says which it took.
//
// -----------------------------------------------------------------------------
// IMPLEMENTER DECISION 2 (plan §3, item 6 of its bad-ideas list): the
// `getGraphqlBackend()` memoising singleton is DROPPED. This is a plain
// factory.
//
// That singleton was a lazy promise cache that forgot a rejected boot so the
// next request would retry. Its justification was the pre-split world where
// the backend was mounted INSIDE whichever web server was running and booted
// on first GraphQL request — retry-on-failure mattered because a request could
// arrive before the refs cache was ready. Since the PRD-3 process split the
// only caller is the standalone graph server, which awaits exactly one boot at
// module top level, before it listens, and exits non-zero if it fails. There is
// no second call to memoise and no request to retry. Keeping the machinery
// would mean shipping prose describing a world that no longer exists, which is
// the thing this despecialization train is mostly about not doing.
//
// A caller that genuinely wants one shared instance holds the promise itself —
// exactly what `graph.ts` does, in one line.
//
// -----------------------------------------------------------------------------
// `mode` and `prefixing` ARE PASSED EXPLICITLY. The app set neither, so it ran
// at ke-graphql's defaults by accident. They are pinned here because
// `prefixing: "none"` is what makes the emitted field names byte-compatible
// with the committed `schema.graphql` that relay-compiler reads: `prefixing:
// "all"` would namespace-prefix EVERY field in the schema (the blanket M005
// remedy) and invalidate every committed Relay artifact at once. An implicit
// default that a dependency bump could change is exactly the kind of unstated
// fact this package exists to write down. They are constants, not options,
// for the same reason `CUSTOM_MAPPINGS` is (see config/constants.ts).
// =============================================================================

import { relative } from "node:path";
import { createStore, type Plugin } from "@canonical/ke";
import {
  createSchemaPlugin,
  type SchemaPluginApi,
} from "@canonical/ke-graphql";
import { createGraphQLHandler } from "@canonical/ke-graphql/http";
import {
  CUSTOM_MAPPINGS,
  type PragmaProvider,
  type PragmaProviderOptions,
} from "../config/index.js";
import {
  collectTtlSources,
  harvestPrefixes,
  resolveRefsRoot,
  resolveSemRoot,
} from "../sources/index.js";

/** Projection mode, pinned — see this module's header. */
const MODE = "annotated" as const;

/** Field-name prefixing, pinned — see this module's header. */
const PREFIXING = "none" as const;

/**
 * Boot the store, compile the schema, and build the fetch handler.
 *
 * @note Impure — reads the source cache, boots an Oxigraph WASM store, and
 * writes the emitted SDL **only** when `sdlOutput` is given.
 */
export const createPragmaProvider = async (
  options: PragmaProviderOptions = {},
): Promise<PragmaProvider> => {
  const sources = collectTtlSources({
    refsRoot: options.refsRoot ?? resolveRefsRoot(),
    semRoot: options.semRoot ?? resolveSemRoot(),
  });
  const prefixes = harvestPrefixes(sources);
  const graphql = createSchemaPlugin({
    incremental: true,
    mappings: CUSTOM_MAPPINGS,
    mode: MODE,
    prefixing: PREFIXING,
    ...(options.sdlOutput === undefined
      ? {}
      : { sdlOutput: options.sdlOutput }),
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
  /* v8 ignore next 3 -- unreachable via this factory: the plugin is
     constructed two statements above and registers its API synchronously
     during createStore, so a missing API means ke changed its plugin
     protocol. Kept as a loud failure rather than an undefined dereference. */
  if (!api) {
    throw new Error("ke-graphql plugin did not register its API");
  }
  const handle = createGraphQLHandler(api.schema, {
    context: () => api.createContext(store),
    graphiql: true,
    cors: true,
    incremental: true,
  });
  const destination =
    options.sdlOutput === undefined
      ? "SDL output disabled (no sdlOutput given)"
      : `SDL written to ${relative(process.cwd(), options.sdlOutput)}`;
  console.info(
    `[graphql] schema compiled from ${sources.length} TTL sources (${api.diagnostics.length} diagnostics) — ${destination}`,
  );
  return { handle, api };
};
