// SideBySideDiffLine.tsx
import React from "react";
import hljs from "highlight.js";
import "highlight.js/styles/github.css"; // Ensure the theme is imported
import "./GitDiffViewer.css"; // Ensure styles are applied

interface SideBySideDiffLineProps {
  lineNum1?: number | string; // Original line number
  lineNum2?: number | string; // Modified line number
  content1?: string; // Original content
  content2?: string; // Modified content
  type1?: "add" | "remove" | "context"; // Type for original line
  type2?: "add" | "remove" | "context"; // Type for modified line
  language: string;
  wrap: boolean;
}

const SideBySideDiffLine: React.FC<SideBySideDiffLineProps> = ({
  lineNum1,
  lineNum2,
  content1,
  content2,
  type1,
  type2,
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

  let className1 = "diff-code";
  let className2 = "diff-code";

  if (type1 === "remove") className1 += " diff-remove";
  if (type2 === "add") className2 += " diff-add";
  if (wrap) {
    className1 += " wrap";
    className2 += " wrap";
  }

  return (
    <tr>
      {/* Original Line Number */}
      <td className="diff-line-number">
        {lineNum1 !== undefined && lineNum1 !== "" ? (
          <span>{lineNum1}</span>
        ) : (
          <span>&nbsp;</span>
        )}
      </td>
      {/* Original Content */}
      <td
        className={className1}
        dangerouslySetInnerHTML={{
          __html: content1 ? highlight(content1) : "",
        }}
      />

      {/* Modified Line Number */}
      <td className="diff-line-number">
        {lineNum2 !== undefined && lineNum2 !== "" ? (
          <span>{lineNum2}</span>
        ) : (
          <span>&nbsp;</span>
        )}
      </td>
      {/* Modified Content */}
      <td
        className={className2}
        dangerouslySetInnerHTML={{
          __html: content2 ? highlight(content2) : "",
        }}
      />
    </tr>
  );
};

export default SideBySideDiffLine;
