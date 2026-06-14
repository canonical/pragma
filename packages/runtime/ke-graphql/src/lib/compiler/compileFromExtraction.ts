import { deserializeExtraction } from "./artifact.js";
import runPasses from "./runPasses.js";
import type {
  CompilerResult,
  SchemaPluginOptions,
  SerializedExtraction,
} from "./types.js";

/**
 * Rebuild the executable schema from a precomputed extraction artifact —
 * Passes 2-7 only, pure JS, no store. validateSchema/printSchema are skipped
 * by default (assumeValid): the artifact was validated when it was built.
 */
export default function compileFromExtraction(
  artifact: string | SerializedExtraction,
  options: SchemaPluginOptions = {},
  { assumeValid = true }: { assumeValid?: boolean } = {},
): CompilerResult {
  const { extraction } = deserializeExtraction(artifact);
  return runPasses(extraction, options, { skipValidation: assumeValid });
}
