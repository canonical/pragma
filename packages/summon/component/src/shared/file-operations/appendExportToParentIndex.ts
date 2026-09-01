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
 * A whole star-export line, capturing its module path: either quote style,
 * flexible inner whitespace, optional semicolon.
 */
const STAR_EXPORT_LINE = /^export\s*\*\s*from\s*(["'])(.+)\1\s*;?$/;

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
  const modulePath = `./${componentName}/index.js`;
  const exportLine = `export * from "${modulePath}";\n`;

  return ifElseM(
    exists(indexPath),
    // If exists, append (if not already exported)
    flatMap(readFile(indexPath), (content) => {
      // Whole-line match on the parsed module path — a substring check on
      // `./${componentName}` would false-positive on prefix-named siblings
      // (adding Button next to an existing ButtonGroup export), while exact
      // string equality would miss a hand-written equivalent in the other
      // quote style or without the semicolon and append a duplicate.
      const alreadyExported = content.split("\n").some((existingLine) => {
        const match = existingLine.trim().match(STAR_EXPORT_LINE);
        return match !== null && match[2] === modulePath;
      });
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
