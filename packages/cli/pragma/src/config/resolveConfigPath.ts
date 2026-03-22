import { resolve } from "node:path";

/**
 * Resolve the absolute path to pragma.config.json for a given cwd.
 *
 * @param cwd - Directory to resolve from.
 * @returns Absolute file path to the configuration file.
 */
export default function resolveConfigPath(cwd: string): string {
  return resolve(cwd, "pragma.config.json");
}
