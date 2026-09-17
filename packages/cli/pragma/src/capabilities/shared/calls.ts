/**
 * The calls more than one capability's dead end points at, so
 * `callRule.test.ts` can hold each to its verb. "Build the store" is the
 * kernel's own constant (`kernel/spec/call.ts#BUILD_STORE_CALL`), re-exported
 * here so capabilities and kernel make the same call.
 */

import { BUILD_STORE_CALL } from "../../kernel/spec/call.js";
import type { Call } from "../../kernel/spec/index.js";

export { BUILD_STORE_CALL };

/** Link installed skills into the AI harnesses — CLI-only, so it is always spelled as a command. */
export const LINK_SKILLS_CALL: Call = { verb: "setup skills" };

/** Re-run the build showing each file as it parses. `--verbose` is a global CLI flag, so only the command carries it. */
export const VERBOSE_BUILD_CALL: Call = {
  ...BUILD_STORE_CALL,
  cliFlags: ["--verbose"],
};
