/**
 * The recovery-string invariant (D5).
 *
 * A `recovery.cli` hint quotes a command the installed binary answers to, so it
 * must begin with {@link RECOVERY_CLI_PREFIX} — the distribution's own `name`
 * plus a space. {@link callRecovery} takes a CALL and the one call renderer
 * spells it, prefix included, so a hint that names the wrong binary is unwritable rather
 * than merely detected. That is why there is no assertion here: an assertion
 * over a string the caller composed from the prefix cannot fail, and the hints
 * that were actually wrong were raw `cli:` object literals that never reached
 * this function at all. `kernel/copy.test.ts` covers those, at the position.
 *
 * A THIRD authoring route is also legal and reached by NEITHER guard: a `cli`
 * DERIVED from the program's own name at the call site. One site does this —
 * the create mount (`capabilities/create/mount.ts`,
 * `[...detail.chain, suggestion].join(" ")`), whose `chain[0]` is the root
 * Commander program's name, `BIN_NAME` by wiring. It bypasses
 * {@link callRecovery}, and the position rule is structurally blind to it (it
 * flags QUOTED literals containing the distribution's name, never a computed
 * expression) — so D5 holds there by derivation, and the derivation is pinned
 * where the value surfaces: `createGrammar.test.ts` COMPOSES its expected
 * `cli` from {@link RECOVERY_CLI_PREFIX}, so a renamed root program reddens
 * the cell naming the constant. (A separate `startsWith` assertion cannot
 * pin it — behind an exact pin of the same value it has no reachable
 * failing input.)
 *
 * `kernel/packs/schema.ts` holds a user-authored pack's `emptyRecovery.call` to
 * the same shape from the other side — a verb path, never a binary name, because
 * the consuming distribution's renderer supplies one.
 */

import type { Call } from "../spec/call.js";
import { callTool, renderCall } from "../spec/call.js";
import type { Recovery } from "./types.js";

/**
 * Build a {@link Recovery} from the call that recovers.
 *
 * A recovery speaks to BOTH surfaces: `cli` guides a person, while `mcp` names
 * the tool an agent invokes (an agent cannot run a shell command). Both derive
 * from the one call, so they cannot disagree about the verb or its arguments;
 * `mcp` is absent only when the verb is withheld from MCP.
 *
 * @param call - The verb to run and the params to run it with.
 * @param message - Human-readable guidance shown alongside the command.
 * @returns A recovery hint carrying the call in both spellings.
 */
export function callRecovery(call: Call, message: string): Recovery {
  const mcp = callTool(call);
  return { message, cli: renderCall(call, "cli"), ...(mcp ? { mcp } : {}) };
}
