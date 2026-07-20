/**
 * Select the summon generator for a `create` invocation.
 *
 * This module statically imports the summon generator packages' `generators`
 * maps — and importing them runs a top-level `await loadTemplate` that reads
 * every template file from disk. So this module MUST stay behind `create`'s
 * lazy `import()` (R9): the fast paths (`buildProgram` / `__complete` / `--help`
 * / reads) never load it, and `create --yes` never loads React either (the
 * generators pull summon-core, whose Ink UI is dynamic-only).
 */

import { generators as applicationGenerators } from "@canonical/summon-application";
import { generators as componentGenerators } from "@canonical/summon-component";
import type { GeneratorDefinition } from "@canonical/summon-core";
import { generators as packageGenerators } from "@canonical/summon-package";
import { PragmaError } from "../../kernel/error/PragmaError.js";
import type { CreateKind } from "./types.js";

/** The component frameworks that collapse to one `create component` verb. */
export const FRAMEWORKS = ["react", "svelte", "lit"] as const;

/**
 * The generators' `generate` is invariant in its (specific) answer type, so the
 * strongly-typed maps are erased to the base definition via `unknown`. This is
 * runtime-safe: `execute` calls `generate(answers)` with the resolved answers,
 * which carry the fields the specific generator reads.
 */
type GeneratorMap = Record<string, GeneratorDefinition | undefined>;
const componentMap = componentGenerators as unknown as GeneratorMap;
const packageMap = packageGenerators as unknown as GeneratorMap;
const applicationMap = applicationGenerators as unknown as GeneratorMap;

/**
 * Pick the generator for a `create <kind>` run.
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
    const framework = String(params.framework ?? "react");
    const generator = componentMap[`component/${framework}`];
    if (!generator) {
      throw PragmaError.invalidInput("framework", framework, {
        validOptions: [...FRAMEWORKS],
      });
    }
    return generator;
  }
  const generator =
    kind === "package"
      ? packageMap.package
      : applicationMap["application/react"];
  if (!generator) {
    throw PragmaError.internalError(`missing ${kind} generator`);
  }
  return generator;
}
