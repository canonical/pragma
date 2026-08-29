/**
 * E4 (AV-231, Backlog E) — the interactive TTY journeys: cancel + no-freeze,
 * driven end to end through a REAL pseudo-terminal.
 *
 * Until this suite, no test ever drove the shipped binary under a terminal:
 * the interactive-cancel and no-freeze guarantees the CLI promises (see
 * `kernel/project/cli/dispatch.ts` and `kernel/interactivity.ts`) were pinned
 * in-process only. Here the compiled `pragma` entry is spawned under a pty
 * (`ptyDriver.ts` — util-linux `script(1)`, see that module for why not
 * `node-pty`), sent raw keystrokes, and observed for output + exit code:
 *
 *  - H1: an at-prompt Ctrl-C is a DECLINE — clean cancel, "Cancelled." on
 *    stderr, exit 0 (`EXIT.OK`), nothing written.
 *  - H2: a Ctrl-C DURING execution is an INTERRUPT — aborts work underway,
 *    "Cancelled." on stderr, exit 130 (`EXIT.INTERRUPTED`, 128+SIGINT).
 *    H1 and H2 must exit DIFFERENTLY: each test asserts which phase the
 *    wizard actually reached (H1 never executes, H2 provably does), so the
 *    two cannot both pass by hitting the same code path.
 *  - H3: `create 2>/dev/null` must not freeze — interactivity gates on
 *    STDERR being a TTY (`canPrompt`), so a redirected stderr must pick the
 *    non-interactive strategy (a refusal, exit 2) rather than mounting an
 *    invisible wizard that blocks on stdin.
 *  - C3: EOF (`\x04`) on a prompt resolves to a usage error naming the
 *    unanswered prompt (exit 2), never a hang. This was NOT true when the
 *    suite was written: the wizard had no `\x04` handling at all — Ink handed
 *    the byte to the focused text input as a literal character and the run
 *    hung until killed. Fixed alongside this suite in summon-core's
 *    `SessionController.eof` (+ the Wizard Ctrl-D binding); this journey is
 *    the end-to-end proof, and it FAILED against the pre-fix binary.
 *  - C4: Enter on a select list resolves and the wizard advances — no hang.
 *    Scope honesty: every SHIPPED generator select declares a default, so the
 *    "no-default list" wording from the scaffold cannot be driven end to end
 *    against a real generator; Enter submits the highlighted row through the
 *    same submit path whether or not a default moved the initial highlight,
 *    and the degenerate lists (zero options, one option) are pinned
 *    in-process in summon-core's `wizard.test.tsx` (C4 suite).
 *
 * A MISSING PTY DRIVER FAILS; AN UNSUPPORTED PLATFORM SKIPS — LOUDLY. The
 * scaffold gated on `hasPty ? describe : describe.skip`, which made the
 * guarantee able to STOP RUNNING silently — the exact blind-spot shape
 * review flagged elsewhere (an allowlist that skipped an assertion without
 * verifying it still applied). The boundary is drawn by what the absence
 * MEANS: on Linux — every CI lane, and every environment this repo develops
 * on — `script(1)` is part of an Essential package, so its absence (or a
 * failing smoke run) is a broken environment and the probe FAILURE is thrown
 * from `beforeAll`, failing all five journeys with the probe's reason. On a
 * non-Linux platform the driver is not merely missing, it is unsupportable
 * (BSD `script` has incompatible flags), and CI still runs the suite on
 * Linux, so the file skips with the reason printed — a visible skip in a
 * place the guarantee is exercised anyway, not a silent pass where it is not.
 *
 * STABILITY (this suite must not inherit `crossCli.subprocess.test.ts`'s
 * failure modes): content is asserted BEFORE exit codes, so a failure
 * arrives with its diagnosis; every wait shares one generous deadline whose
 * expiry rejects WITH the captured transcript; the driver kills and reaps
 * its child on every path and `afterEach` sweeps stragglers; and H2 makes
 * its interrupt window DETERMINISTIC by injecting write latency
 * (`NODE_OPTIONS --require` shim delaying `fs.promises.writeFile`) instead
 * of racing the real ~10 ms scaffold — the subject's control flow is
 * untouched; it simply runs on a slow disk.
 *
 * The shipped entry is provisioned by `testing/perf/globalSetup.ts` (shared
 * via `vitest.tty.config.ts`), which also rebuilds stale workspace dep dists
 * — so the binary under test always includes the current summon-core wizard.
 */

import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { CANCELLED_MESSAGE } from "../../kernel/error/fromTaskError.js";
import { EXIT } from "../../kernel/project/cli/exitCodes.js";
import { killLiveChildren, probePtyDriver, runUnderPty } from "./ptyDriver.js";

const here = dirname(fileURLToPath(import.meta.url));
/** The shipped entry (`node <entry>`), emitted by the shared globalSetup. */
const entry = resolve(here, "../../../dist/src/bin.js");

/** POSIX-quote one argument for the `sh -c` command line `script -c` runs. */
const sq = (value: string): string => `'${value.replaceAll("'", `'\\''`)}'`;

/** The command prefix every journey spawns: the real runtime, real entry. */
const pragma = `${sq(process.execPath)} ${sq(entry)}`;

/** A fresh cwd for one journey (inside the isolated, auto-cleaned run root). */
const freshCwd = (label: string): string =>
  mkdtempSync(join(tmpdir(), `tty-${label}-`));

/** Read a file captured by an in-command redirection, or "" if never written. */
function captured(cwd: string, name: string): string {
  try {
    return readFileSync(join(cwd, name), "utf8");
  } catch {
    return "";
  }
}

// The platform ruling (see module doc): non-Linux skips loudly; on Linux a
// failed probe FAILS in beforeAll rather than skipping.
const onLinux = process.platform === "linux";
if (!onLinux) {
  console.warn(
    "[journeys.interactiveTty] skipped: non-Linux platform " +
      `(${process.platform}); the pty driver needs util-linux script(1). ` +
      "CI exercises these journeys on Linux.",
  );
}
const suite = onLinux ? describe : describe.skip;

suite("interactive TTY journeys — cancel + no-freeze (E4, real pty)", () => {
  beforeAll(() => {
    const status = probePtyDriver();
    if (!status.ok) {
      // FAIL, do not skip: on Linux the driver's absence is a broken
      // environment, and a guarantee that can quietly stop running is a
      // permanent blind spot (module doc, "A MISSING PTY DRIVER FAILS").
      throw new Error(
        `pty driver unavailable on Linux — failing the TTY journeys instead ` +
          `of silently skipping them: ${status.reason}`,
      );
    }
  });

  afterEach(() => {
    killLiveChildren();
  });

  it("H1: Ctrl-C at a wizard prompt is a DECLINE (stderr 'Cancelled.', exit 0, nothing written)", async () => {
    const cwd = freshCwd("h1");
    // stdout → file: the pty transcript is then the wizard's stderr render
    // plus the boundary's stderr epilogue, assertable as the stderr surface.
    const outcome = await runUnderPty({
      command: `${pragma} create component react > stdout.txt`,
      cwd,
      steps: [{ waitFor: /Component path:/, send: "\x03" }],
    });

    // Diagnosis before verdict: the message, then the phase, then the code.
    expect(outcome.transcript).toContain(CANCELLED_MESSAGE);
    expect(outcome.transcript).toContain("No files were written.");
    // The cancel landed AT THE PROMPT: execution (and even the confirm gate)
    // was never reached — this is what makes H1's exit 0 mean "decline",
    // where H2 proves the same keystroke mid-execution means exit 130.
    expect(outcome.transcript).not.toContain("Proceed?");
    expect(outcome.transcript).not.toContain("Generating");
    // A decline is a user choice, not a failure — and not an interrupt.
    expect(outcome.exitCode).toBe(EXIT.OK);
    // Nothing reached stdout (the data stream) and nothing was scaffolded.
    expect(captured(cwd, "stdout.txt")).toBe("");
    expect(captured(cwd, "src/components/MyComponent/index.ts")).toBe("");
  });

  it("H2: Ctrl-C during execution is an INTERRUPT (stderr 'Cancelled.', exit 130)", async () => {
    const cwd = freshCwd("h2");
    // Deterministic interrupt window: delay every generator file write by
    // 300 ms (≈8 writes ⇒ ≳2 s of executing phase) so the Ctrl-C sent on the
    // first progress frame always lands mid-run. Control flow is untouched —
    // the run simply executes on a slow disk.
    const shim = join(freshCwd("h2-shim"), "slowWrites.cjs");
    writeFileSync(
      shim,
      `"use strict";
const fsp = require("node:fs/promises");
const realWriteFile = fsp.writeFile;
fsp.writeFile = function (...args) {
  return new Promise((r) => setTimeout(r, 300)).then(() =>
    realWriteFile.apply(fsp, args),
  );
};
`,
    );
    const outcome = await runUnderPty({
      command: `${pragma} create component react > stdout.txt`,
      cwd,
      env: { NODE_OPTIONS: `--require ${shim}` },
      steps: [
        // Enter accepts each prompt's default; 'y' takes the confirm gate.
        { waitFor: /Component path:/, send: "\r" },
        { waitFor: /Include styles\?/, send: "\r" },
        { waitFor: /Storybook stories\?/, send: "\r" },
        { waitFor: /SSR tests\?/, send: "\r" },
        { waitFor: /Proceed\? \(Y\/n\)/, send: "y" },
        // The executing phase is rendering progress — NOW Ctrl-C.
        { waitFor: /Generating/, send: "\x03", settleMs: 250 },
      ],
      timeoutMs: 90_000,
    });

    expect(outcome.transcript).toContain(CANCELLED_MESSAGE);
    // The run provably ENTERED execution (H1 asserts it never does) and was
    // stopped before finishing — the same keystroke, a different meaning.
    expect(outcome.transcript).toContain("Generating");
    expect(outcome.transcript).not.toContain("Generation complete");
    // Work underway was aborted: UNIX 128+SIGINT, out-of-band from the
    // frozen {0,1,2,3} classification set — and provably NOT H1's exit 0.
    expect(outcome.exitCode).toBe(EXIT.INTERRUPTED);
    expect(captured(cwd, "stdout.txt")).toBe("");
  });

  it("H3: `create 2>/dev/null` does not freeze — non-TTY stderr picks the non-interactive strategy", async () => {
    const cwd = freshCwd("h3");
    // stdin IS a tty here (the pty); only stderr is detached — captured to a
    // file so the refusal (which rides stderr) can be asserted. If the gate
    // read the wrong stream, the wizard would mount invisibly (rendering
    // into stderr.txt) and block on stdin forever: the driver's deadline
    // would kill it and this test would fail with the transcript.
    const outcome = await runUnderPty({
      command: `${pragma} create component react 2>stderr.txt > stdout.txt`,
      cwd,
      steps: [],
    });

    // The refusal names the fix — this is stderr content, asserted first.
    const stderr = captured(cwd, "stderr.txt");
    expect(stderr).toContain("Refusing to scaffold in a non-interactive run");
    expect(stderr).toContain("--component-path");
    // No wizard mounted: no prompt frame anywhere, nothing on the terminal.
    expect(stderr).not.toContain("Component path:");
    expect(outcome.transcript).not.toContain("Component path:");
    // A refusal is a usage error the shell can fix.
    expect(outcome.exitCode).toBe(EXIT.USAGE);
  });

  it("C3: EOF (Ctrl-D) at a prompt resolves to a usage error naming it — never a hang", async () => {
    const cwd = freshCwd("c3");
    const outcome = await runUnderPty({
      command: `${pragma} create component react > stdout.txt`,
      cwd,
      steps: [{ waitFor: /Component path:/, send: "\x04" }],
    });

    // The error names the unanswered prompt and the recovery — stderr first.
    expect(outcome.transcript).toContain(
      'Input ended (EOF) before "componentPath" was answered.',
    );
    expect(outcome.transcript).toContain("pass --yes");
    // EOF is not a decline (that is H1's exit 0) and not an interrupt (H2's
    // 130): input ENDED without the required answer, which is the same usage
    // class as a missing non-interactive answer.
    expect(outcome.exitCode).toBe(EXIT.USAGE);
    expect(captured(cwd, "stdout.txt")).toBe("");
    expect(captured(cwd, "src/components/MyComponent/index.ts")).toBe("");
  });

  it("C4: Enter on a select resolves it and the wizard advances — no hang", async () => {
    const cwd = freshCwd("c4");
    // `create package` carries the one shipped select (`type`). Enter must
    // submit the highlighted row and move on; reaching the NEXT prompt is
    // the proof. The journey then exits via the H1 path (Ctrl-C, clean
    // decline) so its own teardown is itself an asserted behaviour.
    const outcome = await runUnderPty({
      command: `${pragma} create package > stdout.txt`,
      cwd,
      steps: [
        { waitFor: /Package name:/, send: "\r" },
        { waitFor: /Package type:/, send: "\r" },
        { waitFor: /Package description:/, send: "\x03", settleMs: 250 },
      ],
    });

    // The select resolved: the wizard reached the prompt AFTER it.
    expect(outcome.transcript).toContain("Package type:");
    expect(outcome.transcript).toContain("Package description:");
    expect(outcome.transcript).toContain(CANCELLED_MESSAGE);
    expect(outcome.exitCode).toBe(EXIT.OK);
    expect(captured(cwd, "stdout.txt")).toBe("");
  });
});
