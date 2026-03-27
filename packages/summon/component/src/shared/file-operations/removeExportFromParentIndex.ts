import * as path from "node:path";
import { exists, ifElseM, pure, type Task } from "@canonical/task";
import removeLineFromFile from "./removeLineFromFile.js";

/**
 * Remove a component export from a parent index.ts.
 * Idempotent — no-op if the export is not present or the file doesn't exist.
 */
export default function removeExportFromParentIndex(
  parentDir: string,
  componentName: string,
): Task<void> {
  const indexPath = path.join(parentDir, "index.ts");
  const exportLine = `export * from "./${componentName}/index.js";\n`;

  return ifElseM(
    exists(indexPath),
    removeLineFromFile(indexPath, exportLine),
    pure(undefined),
  );
}
