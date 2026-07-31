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
 * Every pass still runs to completion and contributes its diagnostics (the
 * tsc model — nothing aborts mid-pipeline), but ANY error-severity
 * diagnostic — from the extraction seed through composition — refuses the
 * compile: the full list is thrown as a CompilationError. An error diagnostic
 * means the schema is missing something the ontology declared (a dropped
 * field, an unregistered class, a failed extraction query), and a schema
 * minus silently dropped fields must never be served — a boot dies loudly
 * instead. Warnings and infos never abort. Pure — every pass after
 * extraction is store-free.
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
    mode: options.mode,
    provider: options.provider,
    revision: options.revision,
    prefixing: options.prefixing,
  });
  diagnostics.push(...composed.diagnostics);

  // The compile-level fatality gate: ANY error-severity diagnostic refuses
  // the compile, whichever pass produced it. Pass-level behavior is
  // unchanged — a colliding field is still dropped, a conflicting extension
  // is still skipped — but the resulting schema is never handed out: a
  // schema minus silently dropped fields must never be served, so a boot
  // dies loudly with the full diagnostic list instead.
  const errors = diagnostics.filter((d) => d.severity === "error");
  if (!composed.output.schema || errors.length > 0) {
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
