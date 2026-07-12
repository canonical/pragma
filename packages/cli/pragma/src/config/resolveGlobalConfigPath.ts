import { join } from "node:path";
import { globalConfigDir } from "../domains/refs/operations/paths.js";

/**
 * Resolve the absolute path of the global config file.
 *
 * Lives next to `refs.json` in the pragma XDG config directory:
 * `$XDG_CONFIG_HOME/pragma/config.json`, defaulting to
 * `~/.config/pragma/config.json`.
 */
export default function resolveGlobalConfigPath(): string {
  return join(globalConfigDir(), "config.json");
}
