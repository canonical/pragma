// =============================================================================
// compile(): the seven-pass pipeline front door, plus the per-request
// CompilerContext factory (fresh DataLoaders each call).
// =============================================================================

import type { SPARQL, Store } from "@canonical/ke";
import { createEntityLoader } from "../dataloader/entityLoader.js";
import { createInverseLoader } from "../dataloader/inverseLoader.js";
import { createListLoader } from "../dataloader/listLoader.js";
import {
  createTBoxLoader,
  findAnnotationPredicates,
} from "../dataloader/tboxLoader.js";
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
  MappedIR,
  QueryFn,
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

export const createContextFactory = (
  mapped: MappedIR,
  options: SchemaPluginOptions,
): ((store: Store) => CompilerContext) => {
  const annotationPredicates = findAnnotationPredicates(
    [...mapped.ir.properties.values()]
      .filter((p) => p.isAnnotation)
      .map((p) => p.uri),
  );
  return (store: Store): CompilerContext => {
    const query = storeQueryFn(store);
    return {
      entityLoader: createEntityLoader(query, mapped),
      listLoader: createListLoader(query, mapped),
      inverseLoader: createInverseLoader(query, mapped),
      tboxLoader: createTBoxLoader(query, annotationPredicates),
      nameMap: mapped.nameMap,
      store,
      warn: options.onRuntimeWarning ?? defaultWarningHandler(),
    };
  };
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
  const diagnostics: Diagnostic[] = [];

  const extracted = await extract(query, prefixes);
  diagnostics.push(...extracted.diagnostics);

  const built = build(extracted.output, options.mappings);
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

  return {
    schema: composed.output.schema,
    sdl: composed.output.sdl,
    diagnostics,
    nameMap: mapped.output.nameMap,
    mapped: mapped.output,
    createContext: createContextFactory(mapped.output, options),
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
