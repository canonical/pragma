import {
  deleteFile,
  flatMap,
  readFile,
  type Task,
  writeFile,
} from "@canonical/task";

/**
 * Remove a specific line from a file. If the file becomes empty,
 * delete it entirely. Idempotent — no-op if the line is not present.
 */
export default function removeLineFromFile(
  filePath: string,
  line: string,
): Task<void> {
  return flatMap(readFile(filePath), (content) => {
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
}
