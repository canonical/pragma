/**
 * CLI test helpers — runCommand, CommandResult.
 *
 * Provides a synchronous subprocess runner for testing the pragma CLI
 * binary in integration tests.
 */

import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

/** Captured output from a CLI subprocess invocation. */
interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Spawn the pragma CLI binary synchronously and capture its output.
 *
 * @param args - CLI arguments to pass after the binary path.
 * @param cwd - Optional working directory for the subprocess.
 * @returns Captured stdout, stderr, and exit code.
 *
 * @note Impure
 */
function runCommand(args: string[], cwd?: string): CommandResult {
  const binPath = resolve(import.meta.dirname, "../bin.ts");
  const result = spawnSync("bun", ["run", binPath, ...args], {
    cwd,
    encoding: "utf-8",
    timeout: 20_000,
  });

  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    exitCode: result.status ?? 1,
  };
}

export type { CommandResult };
export { runCommand };
