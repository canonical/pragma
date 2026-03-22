import { existsSync } from "node:fs";
import resolveConfigPath from "./resolveConfigPath.js";

/**
 * Check whether a pragma.config.json exists at the given cwd.
 */
export default function configExists(cwd: string): boolean {
  return existsSync(resolveConfigPath(cwd));
}
