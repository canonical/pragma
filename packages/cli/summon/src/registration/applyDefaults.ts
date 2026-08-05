/**
 * The answer defaulting this bin performs before it runs a generator.
 *
 * Its own module rather than a private helper of `registerFromBarrel` because
 * two callers need the SAME function, not two copies of it: the action handler,
 * and the byte-equality conformance case that measures this bin's composition
 * against the fixture summon-core ships. A reproduction in the test would go
 * green through a drift in the production copy, which is the one failure the
 * conformance suite exists to catch on the answer side.
 *
 * Commander is deliberately never given `defaultValue` (see
 * `registerFromBarrel.buildOptionInfo`), so "the user did not supply this" is
 * still distinguishable from "the user supplied the default" when this runs.
 */

import type { GeneratorDefinition } from "@canonical/summon-core";

/**
 * Fill in a generator's prompt defaults for answers the caller did not give.
 *
 * @param prompts - The generator's prompt definitions, in declared order.
 * @param answers - The answers supplied so far (CLI flags, positionals).
 * @returns A new answer record; `answers` is not mutated.
 */
export function applyDefaults(
  prompts: GeneratorDefinition["prompts"],
  answers: Record<string, unknown>,
): Record<string, unknown> {
  const result = { ...answers };
  for (const prompt of prompts) {
    if (!(prompt.name in result) && prompt.default !== undefined) {
      result[prompt.name] = prompt.default;
    }
  }
  return result;
}
