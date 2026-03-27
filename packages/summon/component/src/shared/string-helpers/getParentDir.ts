import * as path from "node:path";

/**
 * Get parent directory of component
 */
export default function getParentDir(componentPath: string): string {
  return path.dirname(componentPath);
}
