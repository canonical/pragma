/**
 * The pseudo-terminal driver for the interactive TTY journeys (E4).
 *
 * WHY `script(1)` AND NOT `node-pty`. Driving the shipped binary under a real
 * terminal needs a pty, and a pty needs syscalls Node does not expose — some
 * native layer is unavoidable. The candidates, evaluated on 2026-08-29:
 *
 * - `node-pty` (the scaffold's named candidate) is a native addon with NO
 *   Linux prebuilds: `bun add node-pty` runs `node-gyp rebuild` at install,
 *   which requires python3 + a C++ toolchain on every dev machine. It failed
 *   outright on a NixOS host with no compiler profile ("Could not find any
 *   Python installation"), and would also require a root-level
 *   `trustedDependencies` entry for bun to run its install script at all.
 * - `@homebridge/node-pty-prebuilt-multiarch` DOES install and load here
 *   (prebuilt N-API binary; verified spawning a pty on the same host), but it
 *   is a third-party fork, needs the same root `trustedDependencies` edit,
 *   and fetches a platform binary from GitHub releases at install time —
 *   three new failure modes in shared install infrastructure, bought for a
 *   suite that only ever runs on Linux CI.
 * - `script(1)` (util-linux) allocates the same kernel pty with ZERO
 *   dependency-graph changes. It is preinstalled on the CI runner
 *   (ubuntu-latest ships it in `bsdutils`, an Essential package built from
 *   the util-linux sources, so `-qec` semantics hold) and on any Linux dev
 *   box. `script -e` propagates the child's exit code, including 130 for a
 *   SIGINT death, which is exactly the surface under test.
 *
 * So: `script -qec '<command>' /dev/null` with the harness writing raw
 * keystrokes to script's stdin (forwarded byte-for-byte to the pty master)
 * and reading the pty slave's output from its stdout. The child sees a real
 * TTY on stdin/stdout/stderr; a test that needs a redirected stream applies
 * the redirection INSIDE the command string, which is also how stderr (the
 * wizard's render stream and the pty transcript) is separated from stdout
 * (redirected to a file and asserted separately).
 *
 * WHAT THIS DRIVER CANNOT TEST: anything off-Linux (macOS `script` is the
 * BSD variant with incompatible flags — the suite skips there, loudly), and
 * per-stream capture of stdout/stderr INTERLEAVING (a pty merges everything
 * written to the terminal; stream identity is recovered via in-command
 * redirection instead).
 *
 * STABILITY RULES (learned from `crossCli.subprocess.test.ts`, the suite's
 * least deterministic spawn test): every wait has one generous overall
 * deadline; a timeout REJECTS with the pending step and the captured
 * transcript, never a bare assertion mismatch; the child is killed and reaped
 * on every path (a per-run `finally` plus the module-level registry swept by
 * {@link killLiveChildren}); and the pty window is given a real size first —
 * a pipe-backed `script` starts with a 0×0 winsize, which makes Ink wrap
 * every frame at column zero.
 */

import {
  type ChildProcessWithoutNullStreams,
  spawn,
  spawnSync,
} from "node:child_process";

/** Whether the `script(1)` pty driver can run here, and if not, why. */
export type PtyDriverStatus =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: string };

/**
 * Probe the pty driver: platform, `script(1)` presence, and a real smoke run
 * that allocates a pty and sizes it with `stty` — the two externals every
 * journey depends on. Synchronous, so a test module can rule at load time.
 */
export function probePtyDriver(): PtyDriverStatus {
  if (process.platform !== "linux") {
    return {
      ok: false,
      reason:
        `platform is ${process.platform}: the driver needs util-linux ` +
        "script(1) semantics (-qec, -e exit propagation), which only Linux provides",
    };
  }
  const smoke = spawnSync(
    "script",
    ["-qec", "stty cols 80 rows 24", "/dev/null"],
    {
      encoding: "utf8",
      timeout: 15_000,
    },
  );
  if (smoke.error !== undefined) {
    return {
      ok: false,
      reason: `script(1) could not be spawned: ${smoke.error.message}`,
    };
  }
  if (smoke.status !== 0) {
    return {
      ok: false,
      reason: `script(1) smoke run exited ${String(smoke.status)}: ${smoke.stderr}`,
    };
  }
  return { ok: true };
}

/** One scripted interaction: when the terminal shows this, type that. */
export interface PtyStep {
  /**
   * Fires when this matches the CLEANED transcript at or beyond the previous
   * step's match — forward-only, so a repainted earlier frame (Ink redraws
   * the whole screen per keystroke) cannot re-trigger a step.
   */
  readonly waitFor: RegExp;
  /** Raw bytes to type (`\r` Enter, `\x03` Ctrl-C, `\x04` Ctrl-D). */
  readonly send: string;
  /**
   * Pause between the match and the keystroke (default 150 ms): the frame
   * that matched renders before Ink's input hooks for it are necessarily
   * active, and a keystroke into the gap is dropped or misread.
   */
  readonly settleMs?: number;
}

/** What a pty run produced. */
export interface PtyOutcome {
  /** Everything the terminal showed, ANSI-stripped ({@link cleanTranscript}). */
  readonly transcript: string;
  /** The raw pty byte stream, for when an escape sequence itself matters. */
  readonly raw: string;
  /**
   * The command's exit code (`script -e` propagates the child's, mapping a
   * signal death to 128+N). Null only for an abnormal `script` death.
   */
  readonly exitCode: number | null;
}

/** Options for one {@link runUnderPty} run. */
export interface PtyRunOptions {
  /**
   * The shell command to run INSIDE the pty (after the harness's `stty`
   * sizing). Redirections in it are how a test detaches a stream from the
   * terminal (`2>/dev/null`) or captures it for assertion (`> stdout.txt`).
   */
  readonly command: string;
  /** Working directory for the run. */
  readonly cwd: string;
  /**
   * Extra environment. The child inherits the test process env (XDG/TMPDIR
   * isolation included) with `TERM` set and `NODE_OPTIONS` REMOVED — a test
   * that wants an injected preamble passes its own `NODE_OPTIONS` here.
   */
  readonly env?: Record<string, string>;
  /** The scripted keystrokes, applied in order. */
  readonly steps?: readonly PtyStep[];
  /**
   * Overall deadline for the whole run (default 60 s — generous, because a
   * loaded CI box is the norm; the passing path settles in low seconds). On
   * expiry the child is SIGKILLed, reaped, and the promise REJECTS with the
   * pending step and the transcript, so a hang diagnoses itself.
   */
  readonly timeoutMs?: number;
}

/** Strip ANSI escapes and carriage returns from a pty byte stream. */
export function cleanTranscript(raw: string): string {
  return (
    raw
      // biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI escapes are control characters by definition.
      .replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, "")
      // biome-ignore lint/suspicious/noControlCharactersInRegex: charset-selection escapes (ESC ( B and kin).
      .replace(/\x1b[()][A-Z0-9]/g, "")
      .replace(/\r/g, "")
  );
}

/** Live children, so a torn-down test can never leak a pty holder. */
const liveChildren = new Set<ChildProcessWithoutNullStreams>();

/** SIGKILL anything a failed/timed-out test left behind (afterEach hygiene). */
export function killLiveChildren(): void {
  for (const child of liveChildren) {
    try {
      child.kill("SIGKILL");
    } catch {
      // Already gone — reaping is what mattered.
    }
  }
  liveChildren.clear();
}

/**
 * Run one command under a real pty and drive it with scripted keystrokes.
 *
 * Resolves when the command exits (steps consumed or not — a run that exits
 * before its steps is asserted through the outcome). Rejects ONLY on the
 * deadline, with the pending step and transcript in the message — the child
 * is already killed and reaped by then.
 */
export function runUnderPty(options: PtyRunOptions): Promise<PtyOutcome> {
  const { command, cwd, steps = [], timeoutMs = 60_000 } = options;
  // A pipe-backed pty starts 0×0 (Ink then wraps at column zero); size it
  // before the subject runs. `exec` keeps the exit status the command's own.
  const sized = `stty cols 120 rows 40; exec ${command}`;
  const env: NodeJS.ProcessEnv = { ...process.env, TERM: "xterm-256color" };
  delete env.NODE_OPTIONS;
  Object.assign(env, options.env);

  return new Promise<PtyOutcome>((resolve, reject) => {
    const child = spawn("script", ["-qec", sized, "/dev/null"], {
      cwd,
      env,
      stdio: ["pipe", "pipe", "pipe"],
    });
    liveChildren.add(child);

    let raw = "";
    let settled = false;
    let stepIndex = 0;
    let cursor = 0; // forward-only match position in the cleaned transcript
    let typing = false;

    const finish = (outcome: PtyOutcome): void => {
      if (settled) return;
      settled = true;
      clearTimeout(deadline);
      clearInterval(pump);
      liveChildren.delete(child);
      resolve(outcome);
    };

    const fail = (message: string): void => {
      if (settled) return;
      settled = true;
      clearTimeout(deadline);
      clearInterval(pump);
      try {
        child.kill("SIGKILL");
      } catch {
        // Exit raced the kill; either way it is being reaped below.
      }
      liveChildren.delete(child);
      reject(
        new Error(
          `${message}\n--- transcript (cleaned) ---\n${cleanTranscript(raw).slice(-4000)}`,
        ),
      );
    };

    const deadline = setTimeout(() => {
      const pending =
        stepIndex < steps.length
          ? `waiting for step ${stepIndex + 1}/${steps.length} (${String(steps[stepIndex]?.waitFor)})`
          : "all steps sent; waiting for exit";
      fail(`pty run timed out after ${timeoutMs}ms: ${pending}`);
    }, timeoutMs);

    const advance = (): void => {
      if (settled || typing || stepIndex >= steps.length) return;
      const step = steps[stepIndex] as PtyStep;
      const cleaned = cleanTranscript(raw);
      const match = step.waitFor.exec(cleaned.slice(cursor));
      if (match === null) return;
      cursor += match.index + match[0].length;
      stepIndex += 1;
      typing = true;
      setTimeout(() => {
        try {
          child.stdin.write(step.send);
        } catch {
          // The run ended first; the outcome assertions will say how.
        }
        typing = false;
      }, step.settleMs ?? 150);
    };

    // Advance on output AND on a timer: a step whose frame already rendered
    // before the previous keystroke's settle delay elapsed emits no further
    // output to re-trigger the check.
    const pump = setInterval(advance, 50);
    child.stdout.on("data", (chunk: Buffer) => {
      raw += chunk.toString();
      advance();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      raw += chunk.toString();
    });
    child.on("error", (error) => {
      fail(`script(1) failed to spawn: ${error.message}`);
    });
    child.on("exit", (code) => {
      // Give the last pty flush a beat to land before the transcript is read.
      setTimeout(() => {
        finish({
          transcript: cleanTranscript(raw),
          raw,
          exitCode: code,
        });
      }, 100);
    });
  });
}
