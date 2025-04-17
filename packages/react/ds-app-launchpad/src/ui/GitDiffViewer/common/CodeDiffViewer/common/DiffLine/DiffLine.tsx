/* @canonical/generator-canonical-ds 0.0.1 */
import type React from "react";
import { useCallback } from "react";
import { useGitDiffViewer } from "../../../../hooks/index.js";
import "./styles.css";
import type { DiffLineProps } from "./types.js";

const componentCssClassName = "ds diff-line";
const firstHunkLineCssClassName = "is-first-hunk";

/**
 * Displays a single line of a diff as a table row with line numbers.
 *
 * @returns {React.ReactElement} - Rendered DiffLine
 */
const DiffLine = ({
  id,
  className,
  style,
  isInteractive,
  onLineClick,
  ...props
}: DiffLineProps): React.ReactElement => {
  const { wrapLines } = useGitDiffViewer();
  const typeClass = `diff-line-${props.type}`;

  const handleLineClick = useCallback(() => {
    if (isInteractive) {
      onLineClick?.();
    }
  }, [isInteractive, onLineClick]);

  return (
    <tr
      id={id}
      style={style}
      className={[
        componentCssClassName,
        typeClass,
        isInteractive && "interactive",
        className,
        props.type === "hunk" &&
          props.hunkIndex === 0 &&
          firstHunkLineCssClassName,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <td
        className={`diff-gutter ${wrapLines ? "wrap" : ""} ${props.type}`}
        tabIndex={isInteractive && props.type !== "hunk" ? 0 : undefined}
        onClick={handleLineClick}
        onKeyUp={(e) => {
          if (e.key === "Enter") {
            handleLineClick();
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
              __html: props.content ? props.content : "\u00A0",
            }}
          />
        )}
      </td>
    </tr>
  );
};

export default DiffLine;
