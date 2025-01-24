// LineByLineDiffLine.tsx
import React from "react";
import hljs from "highlight.js";
import "highlight.js/styles/github.css"; // Ensure the theme is imported
import "./GitDiffViewer.css"; // Ensure styles are applied

interface LineByLineDiffLineProps {
  lineNum1Unified?: number | string; // Original line number
  lineNum2Unified?: number | string; // Modified line number
  contentUnified?: string; // Content for unified view
  typeUnified?: "add" | "remove" | "context"; // Type for unified view
  language: string;
  wrap: boolean;
}

const LineByLineDiffLine: React.FC<LineByLineDiffLineProps> = ({
  lineNum1Unified,
  lineNum2Unified,
  contentUnified,
  typeUnified,
  language,
  wrap,
}) => {
  // Function to highlight content
  const highlight = (content: string) => {
    if (hljs.getLanguage(language)) {
      return hljs.highlight(content, { language }).value;
    }
    return hljs.highlight(content, { language: "plaintext" }).value;
  };

  let className = "diff-code";
  if (typeUnified === "add") className += " diff-add";
  if (typeUnified === "remove") className += " diff-remove";
  if (wrap) {
    className += " wrap";
  }

  return (
    <tr
      className={
        typeUnified === "add"
          ? "diff-add"
          : typeUnified === "remove"
          ? "diff-remove"
          : ""
      }
    >
      {/* Grouped Line Numbers */}
      <td className="diff-line-numbers">
        <span className="line-num1">
          {lineNum1Unified !== undefined && lineNum1Unified !== ""
            ? lineNum1Unified
            : "\u00A0"}
        </span>
        <span className="line-num2">
          {lineNum2Unified !== undefined && lineNum2Unified !== ""
            ? lineNum2Unified
            : "\u00A0"}
        </span>
      </td>

      {/* Unified Content */}
      <td className={`diff-code unified ${wrap ? "wrap" : ""}`}>
        <div
          className="code-content"
          dangerouslySetInnerHTML={{
            __html: contentUnified ? highlight(contentUnified) : "",
          }}
        />
      </td>
    </tr>
  );
};

export default LineByLineDiffLine;
