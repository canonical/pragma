import * as path from "node:path";

/**
 * Extract component name from path
 */
export default function getComponentName(componentPath: string): string {
  return path.basename(componentPath);
}
