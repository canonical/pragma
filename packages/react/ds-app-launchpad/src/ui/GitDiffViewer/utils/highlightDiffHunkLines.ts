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

  const highlightedLines: string[] = hunkLines.map((line, index) => {
    switch (line.type) {
      case "context":
        return highlightedHunkAddedVersion[index];
      case "remove":
        return highlightedHunkDeletedVersion[index];
      case "add":
        return highlightedHunkAddedVersion[index];
    }
  });

  return highlightedLines;
}

export default highlightDiffHunkLines;
