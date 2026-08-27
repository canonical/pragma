/**
 * Test helper: spawn-and-CAPTURE the real `pragma` entry point.
 *
 * {@link measureCommand} (the perf helper) discards stdout/stderr — it only
 * times spawns. This is the complementary helper for tests that need to READ
 * what the process printed: the true end-to-end boundary (argv parsing,
 * first-run, the shipped entry point, real process exit codes).
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

/**
 * The shipped entry the perf `globalSetup` guarantees exists before tests run —
 * the `bin` the published package points at, run the way a consumer runs it.
 */
const SHIPPED_ENTRY = fileURLToPath(
  new URL("../../../dist/src/bin.js", import.meta.url),
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
   * `"shipped"` (default) spawns `node dist/src/bin.js` — the true release
   * boundary, exactly what a consumer's `pragma` runs. `"source"` spawns
   * `bun src/bin.ts` — faster, no rebuild required, for journeys that do not
   * test the shipped-entry boundary itself.
   */
  readonly mode?: "shipped" | "source";
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
  const dir = mkdtempSync(join(tmpdir(), "pragma-runcli-seeded-xdg-"));
  mkdirSync(join(dir, "pragma"), { recursive: true });
  writeFileSync(join(dir, "pragma", "config.json"), "{}\n");
  seededConfigHome = dir;
  return dir;
}

/**
 * Spawn the real `pragma` CLI and capture its output.
 *
 * @param args - Argv passed to the CLI (no `pragma`/runtime prefix).
 * @param options - cwd, env overrides, mode, and timeout.
 * @returns The captured stdout/stderr/exitCode/signal.
 * @note Impure — spawns a child process.
 */
export function runCli(
  args: readonly string[],
  options: RunCliOptions = {},
): RunCliResult {
  const mode = options.mode ?? "shipped";
  // Both modes spawn a RUNTIME with an entry argument now — the built entry is
  // emitted JavaScript, not a self-executing binary, so `node` names it.
  const command = mode === "shipped" ? process.execPath : "bun";
  const entry = mode === "shipped" ? SHIPPED_ENTRY : SOURCE_ENTRY;
  const spawnArgs = [entry, ...args];

  // Colour OFF by default: these tests assert on bytes, and nx exports
  // FORCE_COLOR to its test tasks, so a spawned CLI colours its help even
  // through a pipe — green locally, red in CI, for a difference no assertion
  // meant to make. NO_COLOR is the one convention the style seam obeys
  // unconditionally. FORCE_COLOR is DELETED rather than overridden: Bun warns
  // on stderr when it sees both, and stderr is part of what is asserted.
  // `options.env` still wins, so a test that wants colour asks for it.
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    NO_COLOR: "1",
    XDG_CONFIG_HOME: seededXdgConfigHome(),
  };
  delete env.FORCE_COLOR;

  const result = spawnSync(command, spawnArgs, {
    cwd: options.cwd,
    env: { ...env, ...options.env },
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
  const configHome = mkdtempSync(join(tmpdir(), "pragma-runcli-fresh-cfg-"));
  const stateHome = mkdtempSync(join(tmpdir(), "pragma-runcli-fresh-state-"));
  return { XDG_CONFIG_HOME: configHome, XDG_STATE_HOME: stateHome };
}
