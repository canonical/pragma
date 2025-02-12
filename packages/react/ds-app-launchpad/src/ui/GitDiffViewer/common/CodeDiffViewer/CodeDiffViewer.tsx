/* @canonical/generator-canonical-ds 0.0.1 */
import type React from "react";
import { Fragment, useEffect, useRef } from "react";
import { useDiffViewer } from "../../hooks/index.js";
import { DiffLine } from "./common/index.js";
import "./HighlighTheme.css";
import "./styles.css";
import type { CodeDiffViewerProps } from "./types.js";

const componentCssClassName = "ds code-diff-viewer";

const tableWidthCSSVar = "--table-width";

/**
 * Displays a diff in a table format with line numbers and syntax highlighting.
 * With option to add comments to specific lines and interactive gutter for adding comments.
 *
 * @returns {React.ReactElement} - Rendered CodeDiffViewer
 */
const CodeDiffViewer = ({
  id,
  children,
  className,
  style,
}: CodeDiffViewerProps): React.ReactElement | null => {
  const {
    isCollapsed,
    diff,
    addCommentEnabled,
    setAddCommentEnabled,
    addCommentLocations,
    toggleAddCommentLocation,
    lineDecorations,
  } = useDiffViewer();
  const tableRef = useRef<HTMLTableElement | null>(null);

  // WIP: temporary syntax highlighting
  // TODO: replace with a proper syntax highlighter
  // TODO: add support for option to have external syntax highlighter
  const getLanguage = (filePath: string): string => {
    const extension = filePath.split(".").pop();
    const mapping: { [key: string]: string } = {
      js: "javascript",
      jsx: "javascript",
      ts: "typescript",
      tsx: "typescript",
      css: "css",
      scss: "scss",
      html: "xml",
      py: "python",
      java: "java",
      // Add more mappings as needed
    };
    return mapping[extension || ""] || "plaintext";
  };

  /**
   * Observe the table for size changes and update the CSS variable
   */
  useEffect(() => {
    // SSR check
    if (typeof ResizeObserver === "undefined") return;
    if (!tableRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      if (!tableRef.current) return;
      const tableWidth = tableRef.current?.clientWidth ?? 0;
      tableRef.current.style.cssText = `${tableWidthCSSVar}: ${tableWidth}px`;
    });

    // Observe the table for size changes
    resizeObserver.observe(tableRef.current);

    // Cleanup on unmount
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    if (children && !addCommentEnabled) {
      setAddCommentEnabled(true);
    } else if (!children && addCommentEnabled) {
      setAddCommentEnabled(false);
    }
  }, [children, addCommentEnabled, setAddCommentEnabled]);

  if (isCollapsed) {
    return null;
  }

  return (
    <div
      id={id}
      style={style}
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
    >
      {!diff ? (
        <span>No diff available</span>
      ) : (
        diff.hunks.map((hunk, hunkIndex) => {
          // We'll track the counters for old and new lines
          // as we iterate through each hunk.
          let oldLineCounter = hunk.oldStart;
          let newLineCounter = hunk.newStart;

          return (
            <div key={`${diff.oldPath}-${hunkIndex}`} className="diff-hunk">
              <table className="diff-table" ref={tableRef} tabIndex={-1}>
                <tbody>
                  {/* Hunk header line */}
                  <DiffLine type="hunk" hunkHeader={hunk.header} />

                  {hunk.lines.map((line, lineIndex) => {
                    let lineNum1: number | null = null;
                    let lineNum2: number | null = null;

                    if (line.type === "remove") {
                      // Only the old line number advances
                      lineNum1 = oldLineCounter++;
                    } else if (line.type === "add") {
                      // Only the new line number advances
                      lineNum2 = newLineCounter++;
                    } else {
                      // context line => both lines advance
                      lineNum1 = oldLineCounter++;
                      lineNum2 = newLineCounter++;
                    }

                    const lineNumber = lineNum2 || lineNum1 || 0;

                    // For rendering, if lineNum1 or lineNum2 is null,
                    // you can display e.g. '+' or '-' or an empty cell.
                    return (
                      <Fragment
                        key={`${diff.oldPath}-${hunkIndex}-${lineIndex}`}
                      >
                        {/* Normal diff line */}
                        <DiffLine
                          lineNum1={lineNum1}
                          lineNum2={lineNum2}
                          content={line.content}
                          type={line.type}
                          language={getLanguage(diff.newPath)}
                        />

                        {lineNum2 && lineDecorations?.[lineNum2] && (
                          <tr className="line-decoration">
                            <td className="container">
                              {lineDecorations[lineNum2]}
                            </td>
                          </tr>
                        )}

                        {/* Open comment row, if any */}
                        {lineNum2 &&
                          children &&
                          addCommentLocations.has(lineNum2) && (
                            <tr className="line-decoration">
                              <td className="container">
                                {children(lineNumber, () =>
                                  toggleAddCommentLocation(lineNumber),
                                )}
                              </td>
                            </tr>
                          )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })
      )}
    </div>
  );
};

CodeDiffViewer.displayName = "GitDiffViewer.CodeDiff";

export default CodeDiffViewer;
