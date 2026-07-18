/**
 * The recovery-string invariant (D5).
 *
 * Every `recovery.cli` hint quotes the stable, documented command name, so it
 * must begin with the literal `pragma ` prefix, matching the installed `pragma`
 * binary. Recovery hints are authored through {@link cliRecovery}
 * so the prefix can never drift; {@link assertRecoveryCli} is the single guard,
 * exercised by the invariant test.
 */

import { RECOVERY_CLI_PREFIX } from "../../constants.js";
import type { Recovery } from "./types.js";

/**
 * Assert that a `recovery.cli` string starts with the canonical prefix.
 *
 * @param cli - The candidate CLI recovery command.
 * @throws Error when the command does not begin with `pragma `.
 */
export function assertRecoveryCli(cli: string): void {
  if (!cli.startsWith(RECOVERY_CLI_PREFIX)) {
    throw new Error(
      `recovery.cli must start with "${RECOVERY_CLI_PREFIX}" (D5); got "${cli}"`,
    );
  }
}

/**
 * Build a {@link Recovery} whose `cli` command is guaranteed to carry the
 * canonical prefix.
 *
 * @param cli - The full recovery command, including the `pragma ` prefix.
 * @param message - Human-readable guidance shown alongside the command.
 * @returns A validated recovery hint.
 * @throws Error when `cli` does not begin with `pragma `.
 */
export function cliRecovery(cli: string, message: string): Recovery {
  assertRecoveryCli(cli);
  return { message, cli };
}
