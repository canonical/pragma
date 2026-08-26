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
} from "@canonical/task";
import removeLineFromFile from "./removeLineFromFile.js";

/**
 * Append export to parent index.ts file (or create if not exists).
 * Carries undo metadata: removes the export line (or deletes the index
 * if it was created from scratch).
 */
export default function appendExportToParentIndex(
  parentDir: string,
  componentName: string,
): Task<void> {
  const indexPath = path.join(parentDir, "index.ts");
  const exportLine = `export * from "./${componentName}/index.js";\n`;

  return ifElseM(
    exists(indexPath),
    // If exists, append (if not already exported)
    flatMap(readFile(indexPath), (content) => {
      // Whole-line match — a substring check on `./${componentName}` would
      // false-positive on prefix-named siblings (adding Button next to an
      // existing ButtonGroup export) and silently skip the append.
      const alreadyExported = content
        .split("\n")
        .some((existingLine) => existingLine.trim() === exportLine.trim());
      if (alreadyExported) {
        return pure(undefined); // Already exported
      }
      // AppendFile inserts no separator: when the existing content does not
      // end in a newline, lead with one so the export lands on its own line
      // (and the line-based undo below can always match it).
      const chunk =
        content.length > 0 && !content.endsWith("\n")
          ? `\n${exportLine}`
          : exportLine;
      return appendFile(indexPath, chunk, true, {
        undo: removeLineFromFile(indexPath, exportLine),
      });
    }),
    // If not exists, create new file (default undo: deleteFile is correct)
    writeFile(indexPath, exportLine),
  );
}
