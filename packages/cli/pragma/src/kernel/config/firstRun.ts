/**
 * The setup hint — the read-only replacement for first-run seeding.
 *
 * Onboarding used to WRITE. A pipeline step ran before dispatch on every
 * non-help invocation and created `$XDG_CONFIG_HOME/<bin>/config.json`, so
 * `skill list` — a read — mutated the machine before the user had consented to
 * anything, and a banner interleaved itself into the output of runs that were
 * mutating something else entirely. The config layers already treat the missing
 * file as "every field at its built-in default", so the write bought nothing.
 *
 * Seeding is now a setup target, created inside a consented run. What is left
 * here is a STATELESS hint: shown when the global config file is absent, on
 * read-only surfaces only. There is no marker file — a marker is itself a
 * pre-consent write, which is the exact defect being removed — because the
 * presence of the config IS the state.
 */

import { existsSync } from "node:fs";
import { BIN_NAME, ISSUES_URL } from "../../constants.js";
import { globalConfigPath } from "./paths.js";

/**
 * The hint lines for a machine that has not been set up, or none when it has.
 *
 * @returns The lines to print, or an empty array.
 * @note Impure — probes the global config path.
 */
export function setupHintLines(): string[] {
  if (existsSync(globalConfigPath())) return [];
  return [
    `${BIN_NAME} is pre-release — report issues at ${ISSUES_URL}.`,
    `Run \`${BIN_NAME} setup\` to configure this machine.`,
  ];
}
