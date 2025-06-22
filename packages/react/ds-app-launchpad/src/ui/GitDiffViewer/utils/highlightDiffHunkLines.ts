import hljs from "highlight.js";
import type { Hunk } from "../types.js";

function highlight(code: string, fileExtension: string | undefined): string {
  const formattedFileExtension = fileExtension?.toLowerCase();
  if (!formattedFileExtension) {
    return hljs.highlightAuto(code).value;
  }

  const languages = hljs.listLanguages();

  for (const language of languages) {
    const languageDefinition = hljs.getLanguage(language);
    if (
      language.toLowerCase() === formattedFileExtension ||
      languageDefinition?.aliases?.find(
        (alias) => alias.toLowerCase() === formattedFileExtension,
      )
    ) {
      return hljs.highlight(code, { language }).value;
    }
  }

  // Fall back to auto-detection if no match found
  return hljs.highlightAuto(code).value;
}

function highlightDiffHunkLines(
  filePath: string,
  hunkLines: Hunk["lines"],
): string[] {
  const fileExtension = filePath.split(".").pop();

  const hunkContentAddedVersion = hunkLines
    .filter((line) => line.type === "add" || line.type === "context")
    .map((line) => line.content)
    .join("\n");
  const hunkContentDeletedVersion = hunkLines
    .filter((line) => line.type === "remove" || line.type === "context")
    .map((line) => line.content)
    .join("\n");

  const highlightedHunkAddedVersion = highlight(
    hunkContentAddedVersion,
    fileExtension,
  ).split("\n");
  const highlightedHunkDeletedVersion = highlight(
    hunkContentDeletedVersion,
    fileExtension,
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
