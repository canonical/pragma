import type { DiffFile, Hunk } from "../types.js";

function parseGitDiff(diffText: string): DiffFile[] {
  const lines = diffText.split("\n");
  const files: DiffFile[] = [];
  let currentFile: DiffFile | null = null;
  let currentHunk: Hunk | null = null;
  let currentDiffStart = 0;
  // Regular expressions to match file and hunk headers
  const fileRegex = /^diff --git a\/(.+) b\/(.+)$/;
  const hunkRegex = /^@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@/;
  const oldFileRegex = /^--- (.+)$/;
  const newFileRegex = /^\+\+\+ (.+)$/;

  for (const line of lines) {
    currentDiffStart++;
    const fileMatch = line.match(fileRegex);
    if (fileMatch) {
      // New file diff start
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

    if (!currentFile) continue; // Skip lines until first file header

    const oldFileMatch = line.match(oldFileRegex);
    const newFileMatch = line.match(newFileRegex);
    if (oldFileMatch || newFileMatch) {
      // Determine file change state based on the old/new file indicators
      if (oldFileMatch?.[0].includes("/dev/null")) {
        currentFile.fileChangeState = "added"; // File is new
      } else if (newFileMatch?.[0].includes("/dev/null")) {
        currentFile.fileChangeState = "deleted"; // File is deleted
      } else if (currentFile.fileChangeState === "none") {
        currentFile.fileChangeState = "modified"; // Assume file is modified
      }
      continue;
    }

    const hunkMatch = line.match(hunkRegex);
    if (hunkMatch && currentFile) {
      // New hunk start
      currentHunk = {
        header: line,
        oldStart: Number.parseInt(hunkMatch[1], 10),
        oldLines: hunkMatch[2] ? Number.parseInt(hunkMatch[2], 10) : 1,
        newStart: Number.parseInt(hunkMatch[3], 10),
        newLines: hunkMatch[4] ? Number.parseInt(hunkMatch[4], 10) : 1,
        diffStart: currentDiffStart + 1, // +1 because the first line is the hunk header
        lines: [],
      };
      currentFile.hunks.push(currentHunk);
      continue;
    }

    if (currentHunk && currentFile) {
      // Determine line type and content
      const type = line.startsWith("+")
        ? "add"
        : line.startsWith("-")
          ? "remove"
          : "context";
      const content = line.slice(1); // Remove the leading +, - or space
      currentHunk.lines.push({ type, content });
    }
  }

  if (currentFile) files.push(currentFile);
  return files;
}

export default parseGitDiff;
