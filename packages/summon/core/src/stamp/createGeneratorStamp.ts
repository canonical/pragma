import type GeneratorDefinition from "../types/GeneratorDefinition.js";
import type StampConfig from "../types/StampConfig.js";

/**
 * Build the generated-file stamp for a generator.
 *
 * This is the single source of the stamp identity: every binary that stamps
 * output derives its `StampConfig` here, so `pragma create X` and `summon X`
 * embed the identical generator identifier — a requirement of the cross-binary
 * byte-equality guarantee. The display name is preferred (summon's historical
 * stamp format), falling back to the registry name.
 *
 * @param gen - The generator whose output is being stamped.
 * @returns The stamp configuration for the seam transform.
 */
export default function createGeneratorStamp(
  gen: GeneratorDefinition,
): StampConfig {
  return {
    generator: gen.meta.displayName ?? gen.meta.name,
    version: gen.meta.version,
  };
}
