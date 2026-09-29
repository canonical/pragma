/**
 * The ONE validator of a call: the named verb's real MCP input schema.
 *
 * `capabilities/callRule.test.ts` runs the statically known calls through it,
 * and `setupCallChecking.ts` installs the same function on the call renderer
 * (which hands it the declared verb the call names),
 * so a recovery built where an error is thrown is held to exactly the rule an
 * example is.
 */

import { z } from "zod";
import { buildToolShape } from "../../kernel/project/mcp/registerVerb.js";
import type { Call, VerbSpec } from "../../kernel/spec/types.js";

/**
 * Say what is wrong with a call, or nothing.
 *
 * @param call - The call to check.
 * @param verb - The verb it names, or `undefined` when none is registered.
 * @returns The problem: it names no registered verb, or its params fail that
 *   verb's tool schema.
 */
export function findCallProblem(
  call: Call,
  verb: VerbSpec | undefined,
): string | undefined {
  if (!verb) return "names no registered verb";
  // A call is a next step or an example, and neither may skip the plan or pick
  // a write root: `confirm` and `cwd` are the caller's to add, never a hint's.
  const { confirm: _confirm, cwd: _cwd, ...shape } = buildToolShape(verb);
  const parsed = z
    .object(shape)
    .strict()
    .safeParse(call.params ?? {});
  return parsed.success
    ? undefined
    : parsed.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ");
}
