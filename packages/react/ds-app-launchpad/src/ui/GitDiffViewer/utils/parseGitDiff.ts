import type { DiffFile, Hunk, Position } from "../types.js";

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
      const hunkPositions = [
        Number.parseInt(hunkMatch[1]),
        hunkMatch[2] ? Number.parseInt(hunkMatch[2]) : 1,
        Number.parseInt(hunkMatch[3]),
        hunkMatch[4] ? Number.parseInt(hunkMatch[4]) : 1,
      ];
      const oldPos: Position = {
        start: hunkPositions[0],
        end: hunkPositions[0] + hunkPositions[1],
      };
      const newPos: Position = {
        start: hunkPositions[2],
        end: hunkPositions[2] + hunkPositions[3],
      };
      const diffPos: Position = {
        // +1 because the first line is the hunk header
        start: currentDiffStart + 1,
        end: currentDiffStart + 1,
      };

      // New hunk start
      currentHunk = {
        header: line,
        positions: {
          old: oldPos,
          new: newPos,
          diff: diffPos,
        },
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
      currentHunk.positions.diff.end++;
    }
  }

  if (currentFile) files.push(currentFile);
  return files;
}

export default parseGitDiff;
