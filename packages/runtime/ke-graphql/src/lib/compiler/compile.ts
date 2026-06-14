import type { QueryFn } from "#shared";
import extract from "./extract.js";
import runPasses from "./runPasses.js";
import type { CompilerResult, SchemaPluginOptions } from "./types.js";

/**
 * Run the full seven-pass pipeline against a query surface (ke
 * PluginContext.query at plugin time, or createStoreQueryFn(store) directly).
 *
 * The schema is produced whenever composition succeeds — error diagnostics
 * from earlier passes do not abort compilation (tsc model); only
 * composition failure stops schema creation. The
 * consumer decides its failure policy. Throws CompilationError only when
 * composition fails.
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
