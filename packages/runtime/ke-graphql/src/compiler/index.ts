// =============================================================================
// compile(): the seven-pass pipeline front door, plus the per-request
// CompilerContext factory (fresh DataLoaders each call).
// =============================================================================

import type { SPARQL, Store } from "@canonical/ke";
import { createEntityLoader } from "../dataloader/entityLoader.js";
import { createInverseLoader } from "../dataloader/inverseLoader.js";
import { createListLoader } from "../dataloader/listLoader.js";
import {
  deserializeExtraction,
  type SerializedExtraction,
} from "./artifact.js";
import { build } from "./build.js";
import { compose } from "./compose.js";
import { emit } from "./emit.js";
import { extract } from "./extract.js";
import { map } from "./map.js";
import { wireRelay } from "./relay.js";
import type {
  CompilerContext,
  CompilerResult,
  Diagnostic,
  EntityValue,
  MappedIR,
  QueryFn,
  RawExtraction,
  RuntimeWarningHandler,
  SchemaPluginOptions,
} from "./types.js";
import { validate } from "./validate.js";

/** Adapt a ke Store to the QueryFn surface (string → branded SPARQL). */
export const storeQueryFn =
  (store: Store): QueryFn =>
  (query) =>
    store.query(query as SPARQL<string>);

const defaultWarningHandler = (): RuntimeWarningHandler => {
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

export interface ContextFactory {
  (store: Store | Promise<Store>): CompilerContext;
  /** Drop the shared caches ("process" mode); no-op otherwise. */
  clearCache(): void;
}

export const createContextFactory = (
  mapped: MappedIR,
  options: SchemaPluginOptions,
): ContextFactory => {
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
    (store: Store | Promise<Store>): CompilerContext => {
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
        warn: options.onRuntimeWarning ?? defaultWarningHandler(),
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
};

/**
 * Run the full pipeline against a query surface (ke PluginContext.query at
 * plugin time, or storeQueryFn(store) directly).
 *
 * The schema is produced whenever composition succeeds — error diagnostics
 * from earlier passes do not abort compilation (tsc model, §2.2); the
 * consumer decides its failure policy.
 */
export const compile = async (
  query: QueryFn,
  prefixes: Readonly<Record<string, string>>,
  options: SchemaPluginOptions = {},
): Promise<CompilerResult> => {
  const extracted = await extract(query, prefixes);
  return runPasses(extracted.output, options, {
    diagnostics: extracted.diagnostics,
  });
};

/**
 * Rebuild the executable schema from a precomputed extraction artifact —
 * Passes 2-7 only, pure JS, no store. validateSchema/printSchema are skipped
 * by default (assumeValid): the artifact was validated when it was built.
 */
export const compileFromExtraction = (
  artifact: string | SerializedExtraction,
  options: SchemaPluginOptions = {},
  { assumeValid = true }: { assumeValid?: boolean } = {},
): CompilerResult => {
  const { extraction } = deserializeExtraction(artifact);
  return runPasses(extraction, options, { skipValidation: assumeValid });
};

const runPasses = (
  extraction: RawExtraction,
  options: SchemaPluginOptions,
  {
    diagnostics: seed = [],
    skipValidation = false,
  }: { diagnostics?: Diagnostic[]; skipValidation?: boolean } = {},
): CompilerResult => {
  const diagnostics: Diagnostic[] = [...seed];

  const built = build(extraction, options.mappings);
  diagnostics.push(...built.diagnostics);

  const validated = validate(built.output);
  diagnostics.push(...validated.diagnostics);

  const mapped = map(validated.output, options);
  diagnostics.push(...mapped.diagnostics);

  const emitted = emit(mapped.output);
  diagnostics.push(...emitted.diagnostics);

  const relayed = options.relay === false ? emitted : wireRelay(emitted.output);
  diagnostics.push(...(options.relay === false ? [] : relayed.diagnostics));

  const composed = compose(relayed.output, {
    extensions: options.extensions,
    incremental: options.incremental,
    skipValidation,
  });
  diagnostics.push(...composed.diagnostics);

  // §2.2: only Pass 7 (composition) errors prevent schema creation —
  // C001/C002 extension conflicts and C003 validation failures are fatal;
  // earlier error diagnostics surface in the list without aborting.
  const compositionErrors = composed.diagnostics.filter(
    (d) => d.severity === "error",
  );
  if (!composed.output.schema || compositionErrors.length > 0) {
    throw new CompilationError(diagnostics);
  }

  const factory = createContextFactory(mapped.output, options);
  return {
    schema: composed.output.schema,
    sdl: composed.output.sdl,
    diagnostics,
    nameMap: mapped.output.nameMap,
    mapped: mapped.output,
    extraction,
    createContext: factory,
    clearLoaderCache: factory.clearCache,
  };
};

/** Thrown only when composition fails — carries the full diagnostic list. */
export class CompilationError extends Error {
  readonly diagnostics: Diagnostic[];

  constructor(diagnostics: Diagnostic[]) {
    const errors = diagnostics.filter((d) => d.severity === "error");
    super(
      `ke-graphql: schema composition failed with ${errors.length} error(s):\n${errors
        .map((d) => `  ${d.code}: ${d.message}`)
        .join("\n")}`,
    );
    this.name = "CompilationError";
    this.diagnostics = diagnostics;
  }
}
