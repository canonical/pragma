import type { DiffFile, Hunk } from "../types.js";

function parseGitDiff(diffText: string): DiffFile[] {
  const lines = diffText.split("\n");
  const files: DiffFile[] = [];
  let currentFile: DiffFile | null = null;
  let currentHunk: Hunk | null = null;
  const fileRegex = /^diff --git a\/(.+) b\/(.+)$/;
  const hunkRegex = /^@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@/;
  const oldFileRegex = /^--- (.+)$/;
  const newFileRegex = /^\+\+\+ (.+)$/;

  for (const line of lines) {
    const fileMatch = line.match(fileRegex);
    if (fileMatch) {
      if (currentFile) files.push(currentFile);
      currentFile = {
        oldPath: fileMatch[1],
        newPath: fileMatch[2],
        fileChangeState: "none",
        hunks: [],
      };
      currentHunk = null;
      continue;
    }

    if (!currentFile) continue;

    const oldFileMatch = line.match(oldFileRegex);
    const newFileMatch = line.match(newFileRegex);
    if (oldFileMatch || newFileMatch) {
      if (oldFileMatch?.[0].includes("/dev/null")) {
        currentFile.fileChangeState = "added";
      } else if (newFileMatch?.[0].includes("/dev/null")) {
        currentFile.fileChangeState = "deleted";
      } else if (currentFile.fileChangeState === "none") {
        currentFile.fileChangeState = "modified";
      }
      continue;
    }

    const hunkMatch = line.match(hunkRegex);
    if (hunkMatch && currentFile) {
      currentHunk = {
        header: line,
        oldStart: Number.parseInt(hunkMatch[1], 10),
        oldLines: hunkMatch[2] ? Number.parseInt(hunkMatch[2], 10) : 1,
        newStart: Number.parseInt(hunkMatch[3], 10),
        newLines: hunkMatch[4] ? Number.parseInt(hunkMatch[4], 10) : 1,
        lines: [],
      };
      currentFile.hunks.push(currentHunk);
      continue;
    }

    if (currentHunk && currentFile) {
      const type = line.startsWith("+")
        ? "add"
        : line.startsWith("-")
          ? "remove"
          : "context";
      const content = line.slice(1);
      currentHunk.lines.push({ type, content });
    }
  }

  if (currentFile) files.push(currentFile);
  return files;
}

export default parseGitDiff;
