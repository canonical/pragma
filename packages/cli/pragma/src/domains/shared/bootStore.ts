/**
 * Boot a ke store from resolved semantic packages.
 *
 * Resolves packages via the loader chain (local > git > bundled),
 * then loads all graph content into the store.
 *
 * @note Impure — reads filesystem, creates ke store.
 */

import {
  createStore,
  definePlugin,
  type Plugin,
  type SourceSpec,
  type Store,
} from "@canonical/ke";
import { PragmaError } from "../../error/index.js";
import type { PackageRef } from "../refs/operations/parseRef.js";
import { parsePackageEntry } from "../refs/operations/parseRef.js";
import { recordBootWarning } from "./bootWarnings.js";
import {
  createBundledLoader,
  createGitLoader,
  createLocalLoader,
} from "./loaders/index.js";
import { DEFAULT_PACKAGES } from "./packages.js";
import { resolvePrefixes } from "./prefixes.js";
import type { GraphContent, SemanticPackage } from "./semanticPackage.js";
import { resolveSemanticPackages } from "./semanticPackage.js";

export interface BootStoreOptions {
  /** Override sources (skip package resolution — for testing). */
  sources?: SourceSpec[];
  /** Working directory for resolving relative paths. */
  cwd?: string;
  /** Cache path for serialized store. */
  cache?: string;
  /** Parsed package references for loader-based resolution. */
  refs?: ReadonlyArray<PackageRef>;
  /** Enable query tracing (from config). Env var PRAGMA_TRACE=1 overrides. */
  trace?: boolean;
  /** Additional namespace prefixes merged over the built-in prefix map. */
  prefixes?: Readonly<Record<string, string>>;
}

export interface BootResult {
  /** The initialized ke store. */
  readonly store: Store;
  /** Resolved semantic packages (empty when sources override is used). */
  readonly packages: readonly SemanticPackage[];
}

/**
 * Boot a ke store from configuration.
 *
 * When `sources` is provided, uses them directly (testing path).
 * Otherwise, resolves packages via the loader chain and loads their
 * graph content into the store.
 *
 * @throws PragmaError with code STORE_ERROR on failure.
 */
export async function bootStore(
  options: BootStoreOptions = {},
): Promise<BootResult> {
  try {
    // Testing/programmatic override — use explicit sources. No packages are
    // resolved, so the prefix map is the core base plus the transitional DS
    // fallback and any caller override.
    if (options.sources) {
      const store = await createStore({
        sources: options.sources,
        prefixes: resolvePrefixes([], options.prefixes),
        cache: options.cache,
        cwd: options.cwd,
      });
      return { store, packages: [] };
    }

    // Resolve packages via loader chain: local > git > bundled
    const refs =
      options.refs && options.refs.length > 0
        ? options.refs
        : DEFAULT_PACKAGES.map(parsePackageEntry);
    // Precedence: local (file:// + node_modules) > git cache > bundled
    const loaders = [
      createLocalLoader(),
      createGitLoader(),
      createBundledLoader(),
    ];
    const packages = await resolveSemanticPackages(refs, loaders);

    // Collect all graph content from resolved packages
    const allGraphs = packages.flatMap((pkg) => pkg.graphs);

    // `Plugin<T>` is invariant in its API type and createStore expects
    // `Plugin<void>[]`, so heterogeneous plugins (graph loader + trace) can only
    // share an array via `any`. `unknown` does not satisfy `Plugin<void>`.
    // biome-ignore lint/suspicious/noExplicitAny: intentional — see above
    const plugins: Plugin<any>[] = [createGraphLoaderPlugin(allGraphs)];
    const traceEnabled =
      process.env.PRAGMA_TRACE === "1" || options.trace === true;
    if (traceEnabled) {
      const { createTracePlugin } = await import("../trace/tracePlugin.js");
      const { traceDir } = await import("../refs/operations/paths.js");
      plugins.push(createTracePlugin({ traceDir: traceDir() }));
    }

    // Merge every resolved package's declared prefixes (and the transitional
    // DS fallback) over the generic core, then config overrides — so the
    // store and every query see the packages' own namespaces.
    const store = await createStore({
      sources: [],
      prefixes: resolvePrefixes(packages, options.prefixes),
      cache: options.cache,
      cwd: options.cwd,
      plugins,
    });

    return { store, packages };
  } catch (error) {
    if (error instanceof PragmaError) throw error;
    throw PragmaError.storeError(
      error instanceof Error ? error.message : String(error),
      {
        recovery: {
          message:
            "If this is a parser error, check the TTL syntax of the source graphs " +
            "(the message above names the line and column). Otherwise ensure design " +
            "system packages are installed: bun add -D @canonical/design-system " +
            "@canonical/code-standards @canonical/anatomy-dsl",
        },
      },
    );
  }
}

/**
 * Build the ke plugin that loads resolved graph content into the store.
 *
 * Each graph is loaded independently inside its own try/catch: a single
 * malformed TTL file (e.g. invalid Turtle emitted by an upstream authoring
 * tool) must not abort the entire boot and take the whole CLI down with it.
 * Failed graphs are skipped and *recorded* on the unified boot-warning
 * channel (see `bootWarnings.ts`) — the entry point flushes them once
 * after boot as a summary line (or full lines under `--verbose`), and
 * `pragma doctor` renders the details. A store built from N-1 good graphs
 * is far more useful than a store that refuses to boot because of one bad
 * graph.
 *
 * @note Impure — records boot warnings on parse failure.
 */
export function createGraphLoaderPlugin(
  graphs: readonly GraphContent[],
): Plugin {
  return definePlugin({
    name: "pragma-graph-loader",
    onReady(ctx) {
      for (const graph of graphs) {
        try {
          ctx.load(graph.content, { format: graph.format });
        } catch (error) {
          const reason = error instanceof Error ? error.message : String(error);
          recordBootWarning({
            kind: "malformed-graph",
            subject: graph.path,
            detail: reason,
          });
        }
      }
    },
  });
}
