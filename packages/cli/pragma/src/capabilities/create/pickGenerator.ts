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
 * are load-bearing: `bun build --compile` bundles only statically analysable
 * specifiers, so `import(CREATE_GENERATORS[kind].name)` would leave the
 * generators out of the binary (measured: `Cannot find module
 * '@canonical/summon-component' from '/$bunfs/root/…'`). The declaration decides
 * WHICH generator runs; it cannot decide which module is linked.
 *
 * The maps' `generate` is invariant in its (specific) answer type, so they are
 * erased to the base definition via `unknown` — runtime-safe because `execute`
 * calls `generate(answers)` with the resolved answers, which carry the fields
 * the specific generator reads.
 *
 * THIS BLOCK IS READ AS TEXT. `create/declaredGenerators.ts`'s
 * `readStaticGeneratorImports` — run by `bun run build` before it emits
 * anything, and by `create.test.ts` — parses the imports above and each entry
 * below out of this file's source, and holds the specifiers to
 * `pragma.conf.ts#generators`. It matches each entry literally: two-space
 * indent, `<noun>: <local> as unknown as GeneratorMap,`. So dropping the cast
 * when summon's variance is fixed upstream is NOT a free cosmetic edit — it
 * breaks the reader, which is why that reader fails naming this form. Move a
 * specifier and you move the declaration with it; the build fails otherwise.
 */
const GENERATOR_MAPS: Record<CreateKind, GeneratorMap> = {
  component: componentGenerators as unknown as GeneratorMap,
  package: packageGenerators as unknown as GeneratorMap,
  application: applicationGenerators as unknown as GeneratorMap,
};

/**
 * Pick the generator for a `create <kind>` run.
 *
 * The module this lives in statically imports the summon generator packages'
 * `generators` maps — and importing them pulls summon-core. So it MUST stay
 * behind `create`'s lazy `import()` (R9): the fast paths (`buildProgram` /
 * `__complete` / `--help` / reads) never load it, and `create --yes` never loads
 * React either (summon-core's Ink UI is dynamic-only).
 *
 * `component` is branched on literally: it is the only noun with a framework
 * axis (which is why the verb synthesises a `--framework` enum), and narrowing
 * on `kind` here lets `CREATE_GENERATORS[kind].key` type-check over the
 * remaining nouns without `in`-narrowing gymnastics.
 *
 * @param kind - The create noun.
 * @param params - The coerced params (used for `--framework` on `component`).
 * @returns The selected generator definition.
 * @throws PragmaError INVALID_INPUT for an unknown component framework.
 */
export function pickGenerator(
  kind: CreateKind,
  params: Readonly<Record<string, unknown>>,
): GeneratorDefinition {
  if (kind === "component") {
    const { frameworks } = CREATE_GENERATORS.component;
    const framework = String(params.framework ?? frameworks[0]);
    const generator = GENERATOR_MAPS.component[`component/${framework}`];
    if (!generator) {
      throw PragmaError.invalidInput("framework", framework, {
        validOptions: [...frameworks],
      });
    }
    return generator;
  }
  const generator = GENERATOR_MAPS[kind][CREATE_GENERATORS[kind].key];
  if (!generator) {
    throw PragmaError.internalError(`missing ${kind} generator`);
  }
  return generator;
}
