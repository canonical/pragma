/**
 * Test helper: spawn-and-CAPTURE the real `pragma2` binary.
 *
 * {@link measureCommand} (the perf helper) discards stdout/stderr — it only
 * times spawns. This is the complementary helper for tests that need to READ
 * what the process printed: the true end-to-end boundary (argv parsing,
 * first-run, the compiled/`bun` entry point, real process exit codes).
 *
 * Kept THIN — most behavioral coverage should run in-process via
 * `executeVerb`/`projectCli`/`projectMcp`; reserve `runCli` for tests where the
 * PROCESS BOUNDARY itself is under test (first-run banners, `--version`,
 * real exit codes, `mcp` serve boot).
 */

import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/** The compiled binary the perf `globalSetup` guarantees exists before tests run. */
const COMPILED_BINARY = fileURLToPath(
  new URL("../../../dist/pragma2", import.meta.url),
);

/** The `bin.ts` entry point, for fast source-mode spawns (no rebuild). */
const SOURCE_ENTRY = fileURLToPath(new URL("../../bin.ts", import.meta.url));

/** Options for {@link runCli}. */
export interface RunCliOptions {
  /** Working directory for the spawned process (defaults to the current one). */
  readonly cwd?: string;
  /**
   * Extra/overriding environment variables. Wins over the seeded defaults, so a
   * test that wants a FRESH (unseeded) `XDG_CONFIG_HOME` — e.g. to observe
   * first-run — passes its own here.
   */
  readonly env?: Record<string, string | undefined>;
  /**
   * `"compiled"` (default) spawns `dist/pragma2` — the true release boundary.
   * `"source"` spawns `bun src/bin.ts` — faster, no rebuild required, for
   * journeys that do not test the compiled-binary boundary itself.
   */
  readonly mode?: "compiled" | "source";
  /** Spawn timeout in milliseconds (default 20000). */
  readonly timeoutMs?: number;
}

/** The captured outcome of a `runCli` invocation. */
export interface RunCliResult {
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode: number;
  /** The signal that terminated the process, if any (e.g. on a timeout). */
  readonly signal: string | null;
}

/**
 * A shared XDG_CONFIG_HOME seeded with `pragma/config.json` already present, so
 * a default `runCli` invocation is PAST first-run — otherwise every spawn's
 * stderr would carry the onboarding banner, making assertions order-dependent
 * on whether a given test happens to run first. Memoized per process (module
 * singleton): every test file gets its own worker process, so this is safely
 * shared within a file without cross-file leakage.
 */
let seededConfigHome: string | undefined;
function seededXdgConfigHome(): string {
  if (seededConfigHome !== undefined) return seededConfigHome;
  const dir = mkdtempSync(join(tmpdir(), "pragma2-runcli-seeded-xdg-"));
  mkdirSync(join(dir, "pragma"), { recursive: true });
  writeFileSync(join(dir, "pragma", "config.json"), "{}\n");
  seededConfigHome = dir;
  return dir;
}

/**
 * Spawn the real `pragma2` CLI and capture its output.
 *
 * @param args - Argv passed to the binary (no `pragma2`/`bun` prefix).
 * @param options - cwd, env overrides, mode, and timeout.
 * @returns The captured stdout/stderr/exitCode/signal.
 * @note Impure — spawns a child process.
 */
export function runCli(
  args: readonly string[],
  options: RunCliOptions = {},
): RunCliResult {
  const mode = options.mode ?? "compiled";
  const command = mode === "compiled" ? COMPILED_BINARY : "bun";
  const spawnArgs = mode === "compiled" ? [...args] : [SOURCE_ENTRY, ...args];

  const result = spawnSync(command, spawnArgs, {
    cwd: options.cwd,
    env: {
      ...process.env,
      XDG_CONFIG_HOME: seededXdgConfigHome(),
      ...options.env,
    },
    encoding: "utf-8",
    timeout: options.timeoutMs ?? 20_000,
  });

  if (result.error) {
    throw new Error(
      `runCli: failed to spawn ${command} ${spawnArgs.join(" ")} — ${result.error.message}`,
    );
  }

  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    exitCode: result.status ?? (result.signal ? 1 : 0),
    signal: result.signal ?? null,
  };
}

/**
 * Build a fresh, unseeded XDG env overlay — for tests that WANT first-run
 * (a config home with no `pragma/config.json` yet).
 *
 * @returns An env overlay a caller spreads into `RunCliOptions.env`.
 * @note Impure — creates a temp directory.
 */
export function freshXdgEnv(): Record<string, string> {
  const configHome = mkdtempSync(join(tmpdir(), "pragma2-runcli-fresh-cfg-"));
  const stateHome = mkdtempSync(join(tmpdir(), "pragma2-runcli-fresh-state-"));
  return { XDG_CONFIG_HOME: configHome, XDG_STATE_HOME: stateHome };
}
