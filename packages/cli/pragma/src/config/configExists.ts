import { existsSync } from "node:fs";
import resolveConfigPath from "./resolveConfigPath.js";

/**
 * Check whether a pragma.config.json exists at the given cwd.
 *
 * @param cwd - Directory to check for configuration.
 * @returns `true` if the config file exists.
 *
 * @note Impure — reads filesystem.
 */
export default function configExists(cwd: string): boolean {
  return existsSync(resolveConfigPath(cwd));
}
