/**
 * Bundled generator packs.
 *
 * The generator sets pragma ships by default, statically imported so the
 * single-file build embeds them. Each package's full generator set is exposed —
 * every generator, always — grouped into `create <noun>` commands and
 * `create_<noun>` MCP tools by {@link compileGeneratorPack}.
 *
 * This is the write-side counterpart of the bundled story packs. In a later
 * slice these move into the packages themselves (declared, dynamically
 * resolved) so the core ships no generator wiring at all; today they are
 * bundled transitional entries, like the story packs.
 */

import { generators as applicationGenerators } from "@canonical/summon-application";
import { generators as componentGenerators } from "@canonical/summon-component";
import { generators as packageGenerators } from "@canonical/summon-package";
import compileGeneratorPack, {
  type CompiledGeneratorPack,
  type GeneratorSet,
} from "./compileGeneratorPack.js";

/** Every generator set pragma bundles, in surface order. */
const BUNDLED_GENERATOR_SETS: readonly GeneratorSet[] = [
  componentGenerators,
  packageGenerators,
  applicationGenerators,
];

let cached: CompiledGeneratorPack | undefined;

/**
 * Compile every bundled generator pack into its CLI commands and MCP specs.
 *
 * Memoized — the generator sets are static, and both the CLI and MCP
 * registration paths call this.
 *
 * @returns The merged commands and specs across all bundled packs.
 */
export default function bundledGeneratorPacks(): CompiledGeneratorPack {
  if (cached) return cached;
  const commands = [];
  const specs = [];
  for (const set of BUNDLED_GENERATOR_SETS) {
    const compiled = compileGeneratorPack(set);
    commands.push(...compiled.commands);
    specs.push(...compiled.specs);
  }
  cached = { commands, specs };
  return cached;
}
