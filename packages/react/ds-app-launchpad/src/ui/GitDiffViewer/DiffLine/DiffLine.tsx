/* @canonical/generator-canonical-ds 0.0.1 */
import hljs from "highlight.js";
import type React from "react";
import "./DiffLine.css";
import type { DiffLineProps } from "./types.js";

const componentCssClassName = "ds diff-line";

/**
 * description of the DiffLine component
 * @returns {React.ReactElement} - Rendered DiffLine
 */
const DiffLine = ({
  id,
  className,
  style,
  language = "plaintext",
  wrapLines,
  onCommentOpen,
  ...props
}: DiffLineProps): React.ReactElement => {
  const gutterIsInteractive = !!onCommentOpen;
  const typeClass = `diff-line-${props.type}`;
  const highlight = (content: string) => {
    if (hljs.getLanguage(language)) {
      return hljs.highlight(content, { language }).value;
    }
    return hljs.highlight(content, { language: "plaintext" }).value;
  };

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
        className={`diff-gutter ${wrapLines ? "wrap" : ""}`}
        tabIndex={gutterIsInteractive && props.type !== "hunk" ? 0 : undefined}
        onClick={() => onCommentOpen?.()}
      >
        {props.type === "hunk" ? (
          "\u00A0"
        ) : (
          <div className="diff-line-numbers">
            <span className="line-num">{props.lineNum1 ?? ""}</span>
            <span className="line-num">{props.lineNum2 ?? ""}</span>
          </div>
        )}
      </td>
      <td className={`diff-content ${wrapLines ? "wrap" : ""}`}>
        {props.type === "hunk" ? (
          <pre>{props.hunkHeader}</pre>
        ) : (
          <pre
            dangerouslySetInnerHTML={{
              __html: props.content ? highlight(props.content) : "\u00A0",
            }}
          ></pre>
        )}
      </td>
    </tr>
  );
};

export default DiffLine;
