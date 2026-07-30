/**
 * The recovery-string invariant (D5).
 *
 * A `recovery.cli` hint quotes a command the installed binary answers to, so it
 * must begin with {@link RECOVERY_CLI_PREFIX} — the distribution's own `name`
 * plus a space. Every hint the KERNEL builds is authored through
 * {@link cliRecovery}. `src/capabilities/**` is not there yet: its generic
 * modules still author raw `cli:`/`remedy:` literals that nothing validates,
 * which is the next tranche of this projection.
 *
 * {@link cliRecovery} takes the FULL command rather than the suffix, so its
 * check only ever catches a hand-written literal — every caller inside the
 * package composes the string from the prefix, which makes the assertion
 * unfalsifiable at those sites. Having `cliRecovery` own the prefix (callers
 * passing `"sources update"`) deletes the assertion and the interpolations and
 * makes a wrong hint unwritable rather than merely detected; it is blocked
 * here because the concurrent lock-removal lane owns three of the call sites.
 */

import { RECOVERY_CLI_PREFIX } from "../../constants.js";
import type { Recovery } from "./types.js";

/**
 * Assert that a `recovery.cli` string starts with the canonical prefix.
 *
 * @param cli - The candidate CLI recovery command.
 * @throws Error when the command does not begin with {@link RECOVERY_CLI_PREFIX}.
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
 * canonical prefix, optionally pairing it with an MCP tool an agent can call.
 *
 * A recovery may need to speak to BOTH surfaces: the `cli` string guides a human,
 * while `mcp` names the tool an agent invokes (an agent cannot run a shell
 * command). The single human `message` is shared by both.
 *
 * @param cli - The full recovery command, including {@link RECOVERY_CLI_PREFIX}.
 * @param message - Human-readable guidance shown alongside the command.
 * @param mcp - The MCP tool (and optional params) an agent calls to recover.
 * @returns A validated recovery hint.
 * @throws Error when `cli` does not begin with {@link RECOVERY_CLI_PREFIX}.
 */
export function cliRecovery(
  cli: string,
  message: string,
  mcp?: Recovery["mcp"],
): Recovery {
  assertRecoveryCli(cli);
  return { message, cli, ...(mcp ? { mcp } : {}) };
}
