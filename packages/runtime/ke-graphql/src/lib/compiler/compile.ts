import type { QueryFn } from "../shared/index.js";
import extract from "./extract.js";
import runPasses from "./runPasses.js";
import type { CompilerResult, SchemaPluginOptions } from "./types.js";

/**
 * Run the full seven-pass pipeline against a query surface (ke
 * PluginContext.query at plugin time, or createStoreQueryFn(store) directly).
 *
 * Every pass runs to completion and contributes diagnostics (the tsc
 * model — nothing aborts mid-pipeline), but ANY error-severity diagnostic
 * refuses the compile: a CompilationError carrying the full list is thrown.
 * A schema minus silently dropped fields must never be served, so a boot
 * dies loudly instead. Warnings and infos surface in result.diagnostics
 * while the schema builds; the consumer decides its policy for those.
 *
 * @note Impure — Pass 1 executes SPARQL queries against the store through
 * the provided query function.
 */
export default async function compile(
  query: QueryFn,
  prefixes: Readonly<Record<string, string>>,
  options: SchemaPluginOptions = {},
): Promise<CompilerResult> {
  const extracted = await extract(query, prefixes);
  return runPasses(extracted.output, options, {
    diagnostics: extracted.diagnostics,
  });
}
