/**
 * The calls more than one capability's dead end points at. Named once, so every
 * empty state that means "build the store" makes the same call, spelled for the
 * surface it prints on, and `callRule.test.ts` can hold each to its verb.
 */

import type { Call } from "../../kernel/spec/index.js";

/** Build (or rebuild) the store from the configured packs. */
export const BUILD_STORE_CALL: Call = { verb: "sources update" };

/** Link installed skills into the AI harnesses — CLI-only, so it is always spelled as a command. */
export const LINK_SKILLS_CALL: Call = { verb: "setup skills" };

/** Re-run the build showing each file as it parses. `--verbose` is a global CLI flag, so only the command carries it. */
export const VERBOSE_BUILD_CALL: Call = {
  ...BUILD_STORE_CALL,
  cliFlags: ["--verbose"],
};
