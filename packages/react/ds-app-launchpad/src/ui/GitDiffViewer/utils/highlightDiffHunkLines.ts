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
      languageDefinition?.aliases?.some(
        (alias) => alias.toLowerCase() === formattedFileExtension,
      )
    ) {
      return hljs.highlight(code, { language }).value;
    }
  }

  // Fall back to auto-detection if no match found
  return hljs.highlightAuto(code).value;
}

/**
 * Splits HTML spans that contain newline characters into separate spans for each line.
 * This is useful for diff viewers where each line needs to be highlighted individually
 * while preserving the original syntax highlighting CSS classes.
 *
 * @example
 * ```typescript
 * // Input HTML with multiline comment span
 * const input = '<span class="hljs-comment">/**\\n * Description\\n *\/</span>';
 *
 * const output = splitMultilineSpans(input);
 * // Returns: '<span class="hljs-comment">/**</span>\\n<span class="hljs-comment"> * Description</span>\\n<span class="hljs-comment"> *\/</span>'
 * ```
 *
 * @example
 * ```typescript
 * // Input with multiple multiline spans
 * const input = '<span class="hljs-keyword">function</span> <span class="hljs-title">test() {\\n  console.log("hello");\\n}</span>';
 *
 * const output = splitMultilineSpans(input);
 * // Returns: '<span class="hljs-keyword">function</span> <span class="hljs-title">test() {</span>\\n<span class="hljs-title">  console.log("hello");</span>\\n<span class="hljs-title">}</span>'
 * ```
 */
function splitMultilineSpans(html: string): string {
  return html.replace(
    /<span([^>]*)>([^<]*?\n[^<]*?)<\/span>/g,
    (match, attributes, content) => {
      const lines = content.split("\n");
      return lines
        .map((line: string) => `<span${attributes}>${line}</span>`)
        .join("\n");
    },
  );
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

  const highlightedHunkAddedVersion = splitMultilineSpans(
    highlight(hunkContentAddedVersion, fileExtension),
  ).split("\n");
  const highlightedHunkDeletedVersion = splitMultilineSpans(
    highlight(hunkContentDeletedVersion, fileExtension),
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
