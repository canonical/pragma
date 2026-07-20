/**
 * The injectable platform-paths seam. One impure reader
 * ({@link readPlatformEnv}) captures the host — OS family, environment, home
 * directory, and whether the process runs under WSL — into a plain
 * {@link PlatformEnv} value; every other export is a PURE function of that
 * value. Detection and config resolution take a `PlatformEnv` rather than
 * touching `process`/`os` directly, so a test drives any OS + env matrix by
 * handing in a fixture.
 *
 * Exercised is not validated: the fixture seam lets the unit tests EXERCISE the
 * linux / darwin / win32 / WSL arms deterministically, and this file reports
 * 100% coverage — but coverage only proves the code ran, not that the paths are
 * right. Only the linux arm runs on the CI host; the darwin / win32 / WSL /
 * `$USER` mappings are the conventional best-guess locations (env-paths style)
 * and have NOT been confirmed against a real macOS / Windows / WSL machine.
 * Treat them as unproven guesses until AV-287 validates them on real hosts.
 */

import { readFileSync } from "node:fs";
import { homedir } from "node:os";

/** The three host families the harnesses layer resolves paths for. */
export type PlatformId = "linux" | "darwin" | "win32";

/**
 * A captured snapshot of the host platform: the OS family, the process
 * environment, the home directory, and whether the process runs inside WSL
 * (a linux platform reaching a Windows host filesystem under `/mnt/c`).
 */
export interface PlatformEnv {
  readonly platform: PlatformId;
  readonly env: Readonly<Record<string, string | undefined>>;
  readonly home: string;
  /**
   * Whether the process runs under WSL. Captured host state: no path currently
   * resolves through it (WSL-aware path resolution is an unproven guess deferred
   * to AV-287), but it is snapshotted here with the rest of the host so that
   * resolution has a single place to read from when it lands.
   */
  readonly isWsl: boolean;
}

/**
 * Detect whether the environment is WSL: an explicit WSL env marker wins,
 * otherwise the kernel version string is probed for the "microsoft" signature.
 *
 * @param env - The process environment to inspect.
 * @param readProcVersion - Reader for `/proc/version` (injected for testability).
 * @returns True when running under the Windows Subsystem for Linux.
 */
export const detectWsl = (
  env: Readonly<Record<string, string | undefined>>,
  readProcVersion: () => string,
): boolean => {
  if (env.WSL_DISTRO_NAME !== undefined || env.WSL_INTEROP !== undefined) {
    return true;
  }
  return /microsoft/i.test(readProcVersion());
};

/* v8 ignore start -- reads /proc/version off the real host; detectWsl is unit-tested with an injected reader */
const readProcVersion = (): string => {
  try {
    return readFileSync("/proc/version", "utf8");
  } catch {
    return "";
  }
};
/* v8 ignore stop */

/**
 * Assemble a {@link PlatformEnv} from raw host readings — the PURE core of
 * {@link readPlatformEnv}. Maps a Node `process.platform` string to a
 * {@link PlatformId} (anything other than `darwin`/`win32` is treated as linux)
 * and wires up the WSL flag (only a linux host is probed). Extracted so this
 * mapping and the WSL wiring — the layer's only real branches — stay
 * coverage-checked, while {@link readPlatformEnv} keeps nothing but the
 * genuinely untestable live host reads.
 *
 * @param nodePlatform - The raw `process.platform` value.
 * @param env - The process environment.
 * @param home - The home directory.
 * @param readProcVersion - Reader for `/proc/version` (injected for testability).
 * @returns The assembled platform snapshot.
 */
export const buildPlatformEnv = (
  nodePlatform: string,
  env: Readonly<Record<string, string | undefined>>,
  home: string,
  readProcVersion: () => string,
): PlatformEnv => {
  const platform: PlatformId =
    nodePlatform === "darwin" || nodePlatform === "win32"
      ? nodePlatform
      : "linux";
  return {
    platform,
    env,
    home,
    isWsl: platform === "linux" && detectWsl(env, readProcVersion),
  };
};

/**
 * Capture the live host into a {@link PlatformEnv} — the ONE impure reader the
 * pure path helpers are threaded from. All logic lives in
 * {@link buildPlatformEnv}; only the live `process`/`os`/`/proc` reads are here.
 *
 * @returns The captured platform snapshot.
 * @note Impure — reads `process.platform`, `process.env`, `os.homedir()`, and
 * (on linux) `/proc/version` via {@link detectWsl}.
 */
/* v8 ignore start -- live host reads only (process.platform/env, os.homedir, /proc/version); all logic is in the unit-tested buildPlatformEnv */
export const readPlatformEnv = (): PlatformEnv =>
  buildPlatformEnv(process.platform, process.env, homedir(), readProcVersion);
/* v8 ignore stop */

/**
 * The user's home directory.
 *
 * @param p - The captured platform.
 * @returns The absolute home path.
 */
export const userHome = (p: PlatformEnv): string => p.home;

/**
 * The per-user configuration base directory for the platform: linux
 * `$XDG_CONFIG_HOME ?? ~/.config`, darwin `~/Library/Preferences`, win32
 * `%APPDATA%` (falling back to `~/AppData/Roaming`). Follows the env-paths
 * convention, under which the darwin CONFIG base is `~/Library/Preferences` —
 * distinct from the DATA base (`~/Library/Application Support`, see
 * {@link userDataBase}).
 *
 * @param p - The captured platform.
 * @returns The absolute config base path.
 */
export const userConfigBase = (p: PlatformEnv): string => {
  switch (p.platform) {
    case "darwin":
      return `${p.home}/Library/Preferences`;
    case "win32":
      return p.env.APPDATA ?? `${p.home}/AppData/Roaming`;
    default:
      return p.env.XDG_CONFIG_HOME ?? `${p.home}/.config`;
  }
};

/**
 * The per-user data base directory for the platform: linux
 * `$XDG_DATA_HOME ?? ~/.local/share`, darwin `~/Library/Application Support`,
 * win32 `%LOCALAPPDATA%` (falling back to `~/AppData/Local`).
 *
 * @param p - The captured platform.
 * @returns The absolute data base path.
 */
export const userDataBase = (p: PlatformEnv): string => {
  switch (p.platform) {
    case "darwin":
      return `${p.home}/Library/Application Support`;
    case "win32":
      return p.env.LOCALAPPDATA ?? `${p.home}/AppData/Local`;
    default:
      return p.env.XDG_DATA_HOME ?? `${p.home}/.local/share`;
  }
};
