import { generators as applicationGenerators } from "@canonical/summon-application";
import { generators as componentGenerators } from "@canonical/summon-component";
import type { GeneratorDefinition } from "@canonical/summon-core";
import { generators as packageGenerators } from "@canonical/summon-package";
import { PragmaError } from "../../kernel/error/PragmaError.js";
import { CREATE_GENERATORS } from "./constants.js";
import type { CreateKind } from "./types.js";

type GeneratorMap = Record<string, GeneratorDefinition | undefined>;

/**
 * The declared packages' generator maps, bound by noun. The STATIC imports above
 * are load-bearing: a computed `import(CREATE_GENERATORS[kind].name)` is opaque
 * to every bundler and analyser, and the historical cost was measured — under
 * `bun build --compile` it left the generators out of the artifact entirely
 * (`Cannot find module '@canonical/summon-component'`). The declaration decides
 * WHICH generator runs; it cannot decide which module is reachable.
 *
 * The maps' `generate` is invariant in its (specific) answer type, so they are
 * erased to the base definition via `unknown` — runtime-safe because `execute`
 * calls `generate(answers)` with the resolved answers, which carry the fields
 * the specific generator reads.
 */
const GENERATOR_MAPS: Record<CreateKind, GeneratorMap> = {
  component: componentGenerators as unknown as GeneratorMap,
  package: packageGenerators as unknown as GeneratorMap,
  application: applicationGenerators as unknown as GeneratorMap,
};

/**
 * Pick the generator for one FULL COMMAND PATH (`component/react`,
 * `package`, `application/react`) — a straight lookup over the declared
 * bindings, no framework axis: the path IS the identity, exactly as summon's
 * tree keys it. Callers with a kind+framework surface (MCP) map to a path
 * first.
 *
 * The module this lives in statically imports the summon generator packages'
 * `generators` maps — and importing them pulls summon-core. So it MUST stay
 * behind `create`'s lazy `import()` (R9): the fast paths (`buildProgram` /
 * `__complete` / `--help` / reads) never load it, and `create --yes` never
 * loads React either (summon-core's Ink UI is dynamic-only).
 *
 * @param commandPath - The declared command path to run.
 * @returns The selected generator definition.
 * @throws PragmaError INTERNAL for an undeclared path (callers validate
 *   user-facing inputs before mapping to a path).
 */
export function pickGenerator(commandPath: string): GeneratorDefinition {
  for (const [kind, binding] of Object.entries(CREATE_GENERATORS)) {
    if ((binding.paths as readonly string[]).includes(commandPath)) {
      const generator = GENERATOR_MAPS[kind as CreateKind][commandPath];
      if (generator) return generator;
      break;
    }
  }
  throw PragmaError.internalError(`missing generator for ${commandPath}`);
}
