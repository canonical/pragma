import type { SPARQL, Store } from "@canonical/ke";
import {
  createEntityLoader,
  createInverseLoader,
  createListLoader,
} from "../dataloader/index.js";
import type {
  ContextFactory,
  EntityValue,
  MappedIR,
  QueryFn,
  RuntimeWarningHandler,
  SchemaPluginOptions,
} from "./types.js";

/**
 * Create the default runtime-warning handler: logs each distinct
 * (property, value) coercion failure to the console exactly once.
 *
 * @note Impure — the returned handler writes to the console and tracks the
 * warnings it has already reported.
 */
const createDefaultWarningHandler = (): RuntimeWarningHandler => {
  const seen = new Set<string>();
  return (warning) => {
    const key = `${warning.property} ${warning.value}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    console.warn(
      `[ke-graphql] cannot coerce "${warning.value}" on ${warning.property}: ${warning.reason}`,
    );
  };
};

/**
 * Create the CompilerContext factory for a compiled MappedIR: each call
 * produces a context with fresh DataLoaders ("request" mode) or loaders
 * sharing process-lifetime caches ("process" mode), plus clearCache() to
 * drop the shared caches.
 *
 * @note Impure — the produced contexts execute SPARQL queries against the
 * store at resolve time, and clearCache() mutates the shared caches.
 */
export default function createContextFactory(
  mapped: MappedIR,
  options: SchemaPluginOptions,
): ContextFactory {
  // Process-lifetime loader caches (item: loaderCache "process"). Scoped to
  // this CompilerResult: onReload recompiles and produces a new factory, so
  // cache invalidation on data change is automatic.
  const processCaches =
    options.loaderCache === "process"
      ? {
          entity: new Map<string, Promise<EntityValue | null>>(),
          list: new Map<string, Promise<string[]>>(),
          inverse: new Map<string, Promise<string[]>>(),
        }
      : undefined;

  const factory: ContextFactory = Object.assign(
    (store: Store | Promise<Store>) => {
      // Lazy-store gate: ABox loaders await the store at query time; TBox
      // resolvers read the frozen IR and never touch it.
      const query: QueryFn = async (q) =>
        (await Promise.resolve(store)).query(q as SPARQL<string>);
      return {
        entityLoader: createEntityLoader(query, mapped, processCaches?.entity),
        listLoader: createListLoader(query, mapped, processCaches?.list),
        inverseLoader: createInverseLoader(
          query,
          mapped,
          processCaches?.inverse,
        ),
        nameMap: mapped.nameMap,
        store,
        warn: options.onRuntimeWarning ?? createDefaultWarningHandler(),
      };
    },
    {
      clearCache(): void {
        processCaches?.entity.clear();
        processCaches?.list.clear();
        processCaches?.inverse.clear();
      },
    },
  );
  return factory;
}
