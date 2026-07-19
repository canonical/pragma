/**
 * The injectable platform-paths seam. One impure reader
 * ({@link readPlatformEnv}) captures the host — OS family, environment, home
 * directory, and whether the process runs under WSL — into a plain
 * {@link PlatformEnv} value; every other export is a PURE function of that
 * value. Detection and config resolution take a `PlatformEnv` rather than
 * touching `process`/`os` directly, so a test drives any OS + env matrix by
 * handing in a fixture. That is what lets the 100%-coverage platform layer
 * exercise the linux / darwin / win32 / WSL branches with no real machine.
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
 * Capture the live host into a {@link PlatformEnv} — the ONE impure reader the
 * pure path helpers are threaded from.
 *
 * @returns The captured platform snapshot.
 * @note Impure — reads `process.platform`, `process.env`, `os.homedir()`, and
 * (on linux) `/proc/version` via {@link detectWsl}.
 */
/* v8 ignore start -- the single host reader; every pure consumer receives an injected PlatformEnv in tests */
export const readPlatformEnv = (): PlatformEnv => {
  const platform: PlatformId =
    process.platform === "darwin" || process.platform === "win32"
      ? process.platform
      : "linux";
  const env = process.env;
  return {
    platform,
    env,
    home: homedir(),
    isWsl: platform === "linux" && detectWsl(env, readProcVersion),
  };
};
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
 * `$XDG_CONFIG_HOME ?? ~/.config`, darwin `~/Library/Application Support`,
 * win32 `%APPDATA%` (falling back to `~/AppData/Roaming`).
 *
 * @param p - The captured platform.
 * @returns The absolute config base path.
 */
export const userConfigBase = (p: PlatformEnv): string => {
  switch (p.platform) {
    case "darwin":
      return `${p.home}/Library/Application Support`;
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

/**
 * The Windows host user-profile base as seen from inside WSL
 * (`/mnt/c/Users/<user>`), or null when not under WSL or the Windows user
 * cannot be determined. The Windows user is taken from `$USER` — WSL shares the
 * login name across the interop boundary in the common single-user setup.
 *
 * @param p - The captured platform.
 * @returns The `/mnt/c/Users/<user>` base, or null.
 */
export const windowsHostUserBase = (p: PlatformEnv): string | null => {
  if (!p.isWsl) return null;
  const user = p.env.USER ?? "";
  return user.length > 0 ? `/mnt/c/Users/${user}` : null;
};
