/**
 * The recovery invariant (D5): a `recovery.cli` hint quotes a command the
 * installed binary answers to, so it begins with {@link RECOVERY_CLI_PREFIX}.
 *
 * {@link callRecovery} takes a CALL and the one call renderer spells it, prefix
 * included, so a hint naming the wrong binary — or a `cli` and an `mcp` that
 * disagree — is unwritable. Two routes do not pass through here:
 * raw `cli:` object literals (`kernel/copy.test.ts` polices those at the
 * position), and the create mount, which DERIVES its `cli` from the root
 * program's name (`capabilities/create/mount.ts`; pinned by
 * `createGrammar.test.ts`, whose expectation is composed from the prefix).
 * A pack's `emptyRecovery.call` is held to the same shape from the other side
 * by `kernel/packs/schema.ts`: a verb path, never a binary name.
 */

import { callTool, renderCall } from "../spec/call.js";
import type { Call } from "../spec/types.js";
import type { Recovery } from "./types.js";

/**
 * Build a {@link Recovery} from the call that recovers.
 *
 * A recovery speaks to BOTH surfaces: `cli` guides a person, while `mcp` names
 * the tool an agent invokes (an agent cannot run a shell command). Both derive
 * from the one call, so they cannot disagree about the verb or its arguments;
 * `mcp` is absent only when the verb is withheld from MCP, and carries
 * `confirm: true` for a mutating tool so that following it does the thing.
 *
 * @param call - The verb to run and the params to run it with.
 * @param message - Human-readable guidance shown alongside the command.
 * @returns A recovery hint carrying the call in both spellings.
 */
export function callRecovery(call: Call, message: string): Recovery {
  const mcp = callTool(call);
  return { message, cli: renderCall(call, "cli"), ...(mcp ? { mcp } : {}) };
}
