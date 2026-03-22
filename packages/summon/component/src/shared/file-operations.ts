/**
 * File operation utilities for component generators
 */

import * as path from "node:path";
import {
  appendFile,
  deleteFile,
  exists,
  flatMap,
  ifElseM,
  pure,
  readFile,
  type Task,
  writeFile,
} from "@canonical/task";

/**
 * Remove a specific line from a file. If the file becomes empty,
 * delete it entirely. Idempotent — no-op if the line is not present.
 */
export const removeLineFromFile = (
  filePath: string,
  line: string,
): Task<void> =>
  flatMap(readFile(filePath), (content) => {
    const trimmedLine = line.trim();
    const filtered = content
      .split("\n")
      .filter((l) => l.trim() !== trimmedLine)
      .join("\n");

    if (filtered.trim() === "") {
      return deleteFile(filePath, { undo: null });
    }
    return writeFile(filePath, filtered, { undo: null });
  });

/**
 * Append export to parent index.ts file (or create if not exists).
 * Carries undo metadata: removes the export line (or deletes the index
 * if it was created from scratch).
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
      return appendFile(indexPath, exportLine, true, {
        undo: removeLineFromFile(indexPath, exportLine),
      });
    }),
    // If not exists, create new file (default undo: deleteFile is correct)
    writeFile(indexPath, exportLine),
  );
};

/**
 * Remove a component export from a parent index.ts.
 * Idempotent — no-op if the export is not present or the file doesn't exist.
 */
export const removeExportFromParentIndex = (
  parentDir: string,
  componentName: string,
): Task<void> => {
  const indexPath = path.join(parentDir, "index.ts");
  const exportLine = `export * from "./${componentName}/index.js";\n`;

  return ifElseM(
    exists(indexPath),
    removeLineFromFile(indexPath, exportLine),
    pure(undefined),
  );
};
