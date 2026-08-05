/**
 * Pick the generator a `create <noun>` run executes, out of the GENERATED
 * module map.
 *
 * The literal import specifiers this needs live in `generators.generated.ts`,
 * written by `scripts/build.ts` from `pragma.conf.ts`'s `generators`
 * declaration. `bun build --compile` bundles only literal specifiers — the
 * BUILD writes them, so the declaration decides which modules are linked after
 * all. Nothing in this directory names a generator package.
 */

import type { GeneratorDefinition } from "@canonical/summon-core";
import { PragmaError } from "../../kernel/error/PragmaError.js";
import { GENERATOR_MODULES } from "./generators.generated.js";
import { CREATE_SURFACE } from "./surface.generated.js";
import type { CreateKind } from "./types.js";

/** A noun's surface entry, widened past the generated literal types. */
interface NounSurface {
  readonly package: string;
  readonly key: string;
  readonly axis?: string;
  readonly axisValues?: readonly string[];
  readonly keyPrefix?: string;
}

/**
 * Pick the generator for a `create <kind>` run.
 *
 * The module this lives in statically imports the declared packages' generator
 * maps — and importing them pulls summon-core. So it MUST stay behind `create`'s
 * lazy `import()` (R9): the fast paths (`buildProgram` / `__complete` /
 * `--help` / reads) never load it, and `create --yes` never loads React either
 * (summon-core's Ink UI is dynamic-only).
 *
 * A noun declaring a framework AXIS resolves `<keyPrefix>/<value>`; every other
 * noun resolves its declared `key` directly. There is no per-noun branch: the
 * axis is a declared fact, not a special case for one package's component
 * generators.
 *
 * @param kind - The create noun.
 * @param params - The coerced params (used for the axis flag, when declared).
 * @returns The selected generator definition.
 * @throws PragmaError INVALID_INPUT for an axis value the package does not ship.
 */
export function pickGenerator(
  kind: CreateKind,
  params: Readonly<Record<string, unknown>>,
): GeneratorDefinition {
  const noun: NounSurface = CREATE_SURFACE[kind];
  const map = GENERATOR_MODULES[noun.package];
  if (!map) {
    throw PragmaError.internalError(
      `no generator module linked for ${noun.package}`,
    );
  }

  const { axis, axisValues, keyPrefix } = noun;
  if (
    axis !== undefined &&
    axisValues !== undefined &&
    keyPrefix !== undefined
  ) {
    const value = String(params[axis] ?? axisValues.at(0));
    const generator = map[`${keyPrefix}/${value}`];
    if (!generator) {
      throw PragmaError.invalidInput(axis, value, {
        validOptions: [...axisValues],
      });
    }
    return generator;
  }

  const generator = map[noun.key];
  if (!generator) {
    throw PragmaError.internalError(`missing ${kind} generator`);
  }
  return generator;
}
