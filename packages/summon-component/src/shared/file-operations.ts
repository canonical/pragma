/**
 * File operation utilities for component generators
 */

import * as path from "node:path";
import {
  appendFile,
  exists,
  flatMap,
  ifElseM,
  pure,
  readFile,
  type Task,
  writeFile,
} from "@canonical/summon";

/**
 * Append export to parent index.ts file (or create if not exists)
 */
export const appendExportToParentIndex = (
  parentDir: string,
  componentName: string,
): Task<void> => {
  const indexPath = path.join(parentDir, "index.ts");
  const exportLine = `export * from "./${componentName}/index.js";\n`;

  return ifElseM(
    exists(indexPath),
    // If exists, append (if not already exported)
    flatMap(readFile(indexPath), (content) => {
      if (content.includes(`./${componentName}`)) {
        return pure(undefined); // Already exported
      }
      return appendFile(indexPath, exportLine);
    }),
    // If not exists, create new file
    writeFile(indexPath, exportLine),
  );
};
