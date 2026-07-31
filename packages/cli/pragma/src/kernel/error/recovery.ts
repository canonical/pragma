/**
 * The recovery-string invariant (D5).
 *
 * A `recovery.cli` hint quotes a command the installed binary answers to, so it
 * must begin with {@link RECOVERY_CLI_PREFIX} — the distribution's own `name`
 * plus a space. {@link cliRecovery} takes the command SUFFIX and prepends the
 * prefix itself, so a hint that names the wrong binary is unwritable rather
 * than merely detected. That is why there is no assertion here: an assertion
 * over a string the caller composed from the prefix cannot fail, and the hints
 * that were actually wrong were raw `cli:` object literals that never reached
 * this function at all. `kernel/copy.test.ts` covers those, at the position.
 *
 * `kernel/packs/schema.ts` holds a user-authored pack's `emptyRecovery.cli` to
 * the same shape from the other side — it must NOT carry a prefix, because the
 * consuming distribution's renderer supplies one.
 */

import { RECOVERY_CLI_PREFIX } from "../../constants.js";
import type { Recovery } from "./types.js";

/**
 * Build a {@link Recovery} whose `cli` command carries the distribution's own
 * prefix, optionally pairing it with an MCP tool an agent can call.
 *
 * A recovery may need to speak to BOTH surfaces: the `cli` string guides a human,
 * while `mcp` names the tool an agent invokes (an agent cannot run a shell
 * command). The single human `message` is shared by both.
 *
 * @param command - The recovery command WITHOUT the binary name (`sources update`).
 * @param message - Human-readable guidance shown alongside the command.
 * @param mcp - The MCP tool (and optional params) an agent calls to recover.
 * @returns A recovery hint whose `cli` names this distribution's binary.
 */
export function cliRecovery(
  command: string,
  message: string,
  mcp?: Recovery["mcp"],
): Recovery {
  return {
    message,
    cli: `${RECOVERY_CLI_PREFIX}${command}`,
    ...(mcp ? { mcp } : {}),
  };
}
