import type { Diagnostic, RawExtraction } from "../shared/index.js";
import build from "./build.js";
import CompilationError from "./CompilationError.js";
import compose from "./compose.js";
import createContextFactory from "./createContextFactory.js";
import emit from "./emit.js";
import map from "./map.js";
import type { CompilerResult, SchemaPluginOptions } from "./types.js";
import validate from "./validate.js";
import wireRelay from "./wireRelay.js";

/**
 * Run Passes 2–7 over a RawExtraction and assemble the CompilerResult.
 *
 * Only Pass 7 (composition) errors prevent schema creation —
 * C001/C002 extension conflicts and C003 validation failures throw a
 * CompilationError; earlier error diagnostics surface in the list without
 * aborting. Pure — every pass after extraction is store-free.
 */
export default function runPasses(
  extraction: RawExtraction,
  options: SchemaPluginOptions,
  {
    diagnostics: seed = [],
    skipValidation = false,
  }: { diagnostics?: Diagnostic[]; skipValidation?: boolean } = {},
): CompilerResult {
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

  // Only Pass 7 (composition) errors prevent schema creation —
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
}
