import { resolve } from "node:path";

/**
 * Resolve the path to pragma.config.json for a given cwd.
 */
export default function resolveConfigPath(cwd: string): string {
  return resolve(cwd, "pragma.config.json");
}
