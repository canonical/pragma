/**
 * XDG base-directory resolution for config, cache, and state.
 *
 * Config (the global JSON) lives under `$XDG_CONFIG_HOME/pragma`; the evaluated
 * project-config cache lives under `$XDG_STATE_HOME/pragma/config-cache`. Tests
 * point these env vars at per-run temp directories (see setupXdgIsolation) so
 * they never touch the developer's real state.
 */

import { homedir } from "node:os";
import { join } from "node:path";

/** `$XDG_CONFIG_HOME/pragma` (default `~/.config/pragma`). */
export function configDir(): string {
  const base = process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config");
  return join(base, "pragma");
}

/** `$XDG_CACHE_HOME/pragma` (default `~/.cache/pragma`). */
export function cacheDir(): string {
  const base = process.env.XDG_CACHE_HOME ?? join(homedir(), ".cache");
  return join(base, "pragma");
}

/** `$XDG_STATE_HOME/pragma` (default `~/.local/state/pragma`). */
export function stateDir(): string {
  const base = process.env.XDG_STATE_HOME ?? join(homedir(), ".local", "state");
  return join(base, "pragma");
}

/** The global config file: `$XDG_CONFIG_HOME/pragma/config.json`. */
export function globalConfigPath(): string {
  return join(configDir(), "config.json");
}

/** The evaluated-project-config cache dir: `$XDG_STATE_HOME/pragma/config-cache`. */
export function configCacheDir(): string {
  return join(stateDir(), "config-cache");
}
