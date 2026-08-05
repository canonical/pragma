/**
 * XDG base-directory resolution for config and state.
 *
 * Every directory is namespaced by the distribution's own {@link BIN_NAME}, so a
 * fork stores its state beside this one instead of colliding in it — the
 * greeting that quotes the resolved path then names one program, not two. Config
 * (the global JSON) lives under `$XDG_CONFIG_HOME/<bin>`; the evaluated
 * project-config cache lives under `$XDG_STATE_HOME/<bin>/config-cache`. The
 * store layer's cache root (`$XDG_CACHE_HOME/<bin>`) is resolved by
 * `kernel/runtime/paths.ts` instead — it must stay leaf-clean for the storeless
 * fast path. Tests point these env vars at per-run temp directories (see
 * setupXdgIsolation) so they never touch the developer's real state.
 */

import { homedir } from "node:os";
import { join } from "node:path";
import { BIN_NAME } from "../../constants.js";

/** `$XDG_CONFIG_HOME/<bin>` (default `~/.config/<bin>`). */
function resolveConfigDir(): string {
  const base = process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config");
  return join(base, BIN_NAME);
}

/** `$XDG_STATE_HOME/<bin>` (default `~/.local/state/<bin>`). */
function resolveStateDir(): string {
  const base = process.env.XDG_STATE_HOME ?? join(homedir(), ".local", "state");
  return join(base, BIN_NAME);
}

/** The global config file: `$XDG_CONFIG_HOME/<bin>/config.json`. */
export function globalConfigPath(): string {
  return join(resolveConfigDir(), "config.json");
}

/** The evaluated-project-config cache dir: `$XDG_STATE_HOME/<bin>/config-cache`. */
export function configCacheDir(): string {
  return join(resolveStateDir(), "config-cache");
}
