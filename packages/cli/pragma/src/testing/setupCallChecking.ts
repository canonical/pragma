/**
 * Per-file test setup: make every call rendered under test prove itself.
 *
 * A recovery is built where an error is thrown, from values only that line
 * knows, so the recoveries cannot be listed ahead of time the way examples and
 * pack empties can (`capabilities/callRule.test.ts` lists those). What can be
 * done is to check each one as it is built, with the SAME validator the
 * conformance test uses (`helpers/callSchema.ts` — the verb's real MCP input
 * schema): a recovery naming a verb that does not exist, or params its schema
 * rejects, throws. A fixture's verbs are not the distribution's, so a test that
 * renders a call to one declares it first.
 *
 * The residual, stated plainly: this reaches a recovery only on a line some
 * test executes, and with one set of values. A line no test runs is unchecked
 * until one does.
 *
 * Imported inside the hook, not at the top: a setup file's static imports are
 * evaluated before the test file's `vi.mock` calls register, which would hand
 * `identity.test.ts` this distribution's constants instead of its fork's.
 */

import { beforeAll } from "vitest";

beforeAll(async () => {
  const { capabilities } = await import("../capabilities/index.js");
  const call = await import("../kernel/spec/call.js");
  const { findCallProblem } = await import("./helpers/callSchema.js");
  call.declareVerbs(capabilities.flatMap((module) => module.verbs));
  call.checkCallsWith(findCallProblem);
});
