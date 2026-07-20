/**
 * E4 (AV-231, Backlog E) — the interactive TTY journey. SCAFFOLD.
 *
 * No test in the suite ever drove a REAL terminal, so the interactive-cancel and
 * no-freeze guarantees (H1–H3, C3/C4) were never exercised end to end. Confirming
 * them needs a pseudo-terminal: spawn the compiled `pragma` under a PTY, send raw
 * keystrokes (Ctrl-C = `\x03`, EOF = `\x04`), and observe the exit code + output.
 *
 * `node-pty` is NOT available in this environment (it is a native addon, absent
 * from the dependency set — verified at authoring time), so the journey is
 * scaffolded as `it.todo` behind a `node-pty` availability gate rather than
 * blocking the P0 work. Each todo names the exact behaviour and the exit contract
 * the CLI already promises (see `kernel/project/cli/dispatch.ts`):
 *
 *  - H1: an at-prompt Ctrl-C is a DECLINE — a clean cancel, "Cancelled." on
 *    stderr, exit 0 (`EXIT.OK`).
 *  - H2: a Ctrl-C DURING execution is an INTERRUPT — aborts work underway,
 *    "Cancelled." on stderr, exit 130 (`EXIT.INTERRUPTED`, 128 + SIGINT).
 *  - H3: `create 2>/dev/null` must not freeze — interactivity gates on stderr
 *    being a TTY, so a redirected stderr picks the non-interactive strategy
 *    instead of mounting an invisible wizard that blocks on stdin.
 *  - C3: EOF (`\x04`) on a prompt resolves to a usage error, never a hang.
 *  - C4: an empty select (Enter on a no-default list) does not hang.
 *
 * TODO(AV-231/E4): when `node-pty` (or an equivalent PTY shim) is on the
 * devDependency set, replace each `it.todo` with a PTY-driven `it` that spawns
 * `dist/pragma create …` under a pty, writes the keystroke, and asserts the exit
 * code + "Cancelled." line. The compiled binary is already provisioned for the
 * spawn-e2e layer by `testing/perf/globalSetup.ts`.
 */

import { describe, it } from "vitest";

/** True when a real PTY driver is importable (kept async-free: a resolve probe). */
async function ptyAvailable(): Promise<boolean> {
  try {
    await import("node-pty" as string);
    return true;
  } catch {
    return false;
  }
}

// Authoring-time: `node-pty` is absent, so this resolves to `describe.skip` and
// the todos below stand in as the recorded, unblocked plan. The probe is awaited
// lazily so a future environment with node-pty flips the gate with no edit here.
const hasPty = await ptyAvailable();
const ptyGate = hasPty ? describe : describe.skip;

ptyGate(
  "interactive TTY journey — cancel + no-freeze (E4, node-pty) [SCAFFOLD]",
  () => {
    // These become PTY-driven `it`s once node-pty is available (see module TODO).
    it.todo(
      "H1: Ctrl-C at a wizard prompt cancels cleanly (stderr 'Cancelled.', exit 0)",
    );
    it.todo(
      "H2: Ctrl-C during execution aborts the run (stderr 'Cancelled.', exit 130)",
    );
    it.todo(
      "H3: `create 2>/dev/null` does not freeze (non-TTY stderr -> non-interactive)",
    );
    it.todo("C3: EOF on a prompt resolves to a usage error, never a hang");
    it.todo("C4: an empty select does not hang");
  },
);
