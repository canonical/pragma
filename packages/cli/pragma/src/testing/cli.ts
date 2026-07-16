/**
 * CLI test helpers — runCommand, CommandResult.
 *
 * Provides a synchronous subprocess runner for testing the pragma CLI
 * binary in integration tests.
 */

import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

/** Captured output from a CLI subprocess invocation. */
interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * XDG home whose global config already exists, shared by all default
 * invocations in this file's worker.
 *
 * Subprocesses would otherwise trigger the first-run greeting in whichever
 * test happens to spawn first (the setup-file XDG is fresh per file), making
 * stderr assertions ordering-dependent. Seeding the config keeps every
 * default `runCommand` past first-run; tests that WANT the first-run path
 * pass their own fresh XDG via `env`.
 */
let seededXdg: string | undefined;
function seededXdgHome(): string {
  if (!seededXdg) {
    seededXdg = mkdtempSync(join(tmpdir(), "pragma-cli-xdg-"));
    mkdirSync(join(seededXdg, "pragma"), { recursive: true });
    writeFileSync(join(seededXdg, "pragma", "config.json"), "{}\n");
  }
  return seededXdg;
}

/**
 * Spawn the pragma CLI binary synchronously and capture its output.
 *
 * @param args - CLI arguments to pass after the binary path.
 * @param cwd - Optional working directory for the subprocess.
 * @param env - Extra environment overrides (merged over the seeded default).
 * @returns Captured stdout, stderr, and exit code.
 *
 * @note Impure
 */
function runCommand(
  args: string[],
  cwd?: string,
  env?: Record<string, string>,
): CommandResult {
  const binPath = resolve(import.meta.dirname, "../bin.ts");
  const result = spawnSync("bun", ["run", binPath, ...args], {
    cwd,
    encoding: "utf-8",
    timeout: 20_000,
    env: { ...process.env, XDG_CONFIG_HOME: seededXdgHome(), ...env },
  });

  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    exitCode: result.status ?? 1,
  };
}

export type { CommandResult };
export { runCommand };
