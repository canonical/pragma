import readConfigLayers from "./readConfigLayers.js";
import type { PragmaConfig } from "./types.js";

/**
 * Read the effective pragma configuration for a directory.
 *
 * Layered resolution: built-in defaults, then the global XDG file
 * (`~/.config/pragma/config.json`), then the nearest project
 * `pragma.config.json` at or above `cwd` — each field won by the most
 * specific layer that sets it. Returns defaults (no tier, `"normal"`
 * channel) when no layer configures anything.
 *
 * @param cwd - Directory the project layer is resolved from (defaults to `process.cwd()`).
 * @returns The effective merged configuration.
 * @throws PragmaError with code `CONFIG_ERROR` if a layer file has invalid JSON or values.
 *
 * @note Impure — reads config files from the filesystem.
 */
export default function readConfig(cwd: string = process.cwd()): PragmaConfig {
  return readConfigLayers(cwd).config;
}
