/* @canonical/generator-canonical-ds 0.0.1 */
import hljs from "highlight.js";
import type React from "react";
import { useDiffViewer } from "../../../../hooks/index.js";
import "./styles.css";
import type { DiffLineProps } from "./types.js";

const componentCssClassName = "ds diff-line";

/**
 * Displays a single line of a diff as a table row with line numbers.
 *
 * @returns {React.ReactElement} - Rendered DiffLine
 */
const DiffLine = ({
  id,
  className,
  style,
  language = "plaintext",
  ...props
}: DiffLineProps): React.ReactElement => {
  const { wrapLines, addCommentEnabled, toggleAddCommentLocation } =
    useDiffViewer();
  const gutterIsInteractive = addCommentEnabled;
  const typeClass = `diff-line-${props.type}`;
  const highlight = (content: string) => {
    if (hljs.getLanguage(language)) {
      return hljs.highlight(content, { language }).value;
    }
    return hljs.highlight(content, { language: "plaintext" }).value;
  };

  const lineNumber =
    props.type !== "hunk" ? Number(props.lineNum2 || props.lineNum1) : 0;

  return (
    <tr
      id={id}
      style={style}
      className={[
        componentCssClassName,
        typeClass,
        gutterIsInteractive ? "interactive" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <td
        className={`diff-gutter ${wrapLines ? "wrap" : ""} ${props.type}`}
        tabIndex={gutterIsInteractive && props.type !== "hunk" ? 0 : undefined}
        onClick={() => toggleAddCommentLocation(lineNumber)}
        onKeyUp={(e) => {
          if (e.key === "Enter") {
            toggleAddCommentLocation(lineNumber);
          }
        }}
        onKeyDown={undefined}
      >
        {props.type === "hunk" ? (
          "\u00A0"
        ) : (
          <div className="diff-line-numbers">
            <span className="line-num">{props.lineNum1 ?? "+"}</span>
            <span className="line-num">{props.lineNum2 ?? "-"}</span>
          </div>
        )}
      </td>
      <td className={`diff-content ${wrapLines ? "wrap" : ""}`}>
        {props.type === "hunk" ? (
          <pre>{props.hunkHeader}</pre>
        ) : (
          <pre
            // biome-ignore lint/security/noDangerouslySetInnerHtml: syntax highlighting requires adding generated HTML
            dangerouslySetInnerHTML={{
              __html: props.content ? highlight(props.content) : "\u00A0",
            }}
          />
        )}
      </td>
    </tr>
  );
};

export default DiffLine;
