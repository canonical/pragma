import hljs from "highlight.js";
import type { Hunk } from "../types.js";

function highlight(code: string): string {
  return hljs.highlightAuto(code).value;
}

function highlightDiffHunkLines(hunkLines: Hunk["lines"]): string[] {
  const hunkContentAddedVersion = hunkLines
    .filter((line) => line.type === "add" || line.type === "context")
    .map((line) => line.content)
    .join("\n");
  const hunkContentDeletedVersion = hunkLines
    .filter((line) => line.type === "remove" || line.type === "context")
    .map((line) => line.content)
    .join("\n");

  const highlightedHunkAddedVersion = highlight(hunkContentAddedVersion).split(
    "\n",
  );
  const highlightedHunkDeletedVersion = highlight(
    hunkContentDeletedVersion,
  ).split("\n");

  const highlightedLines: string[] = [];
  let addedOffset = 0;
  let removedOffset = 0;
  for (let i = 0; i < hunkLines.length; i++) {
    const line = hunkLines[i];
    switch (line.type) {
      case "context":
        highlightedLines.push(highlightedHunkDeletedVersion[i - addedOffset]);
        break;
      case "remove":
        highlightedLines.push(highlightedHunkDeletedVersion[i - addedOffset]);
        removedOffset++;
        break;
      case "add":
        highlightedLines.push(highlightedHunkAddedVersion[i - removedOffset]);
        addedOffset++;
        break;
    }
  }

  return highlightedLines;
}

export default highlightDiffHunkLines;
