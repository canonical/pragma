import React, { useEffect, useRef, useState } from "react";
import DiffLine from "./DiffLine/DiffLine.js";
import "./GitDiffViewer.css";
import "./HighlighTheme.css";
import type { GitDiffViewerProps } from "./types.js";

const GitDiffViewer: React.FC<GitDiffViewerProps> = ({
  id,
  className,
  style,
  diff,
  lineDecorations,
  AddComment,
  wrapLines = true,
}) => {
  /**
   * The line number of the currently open comment.
   */
  const [openComment, setOpenComment] = useState<number | null>(null);

  const tableRef = useRef<HTMLTableElement | null>(null);

  /**
   * Decorations indexed by line number.
   */
  const decorationRefs = useRef<Record<number, HTMLTableRowElement | null>>({});

  /**
   * Apply the correct height and width to each line decoration container
   * based on the measured height of the content and the table width.
   */
  useEffect(() => {
    if (typeof ResizeObserver === "undefined") return;
    if (!tableRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      const tableWidth = tableRef.current?.clientWidth ?? 0;
      if (!tableWidth) return;

      // Query all .line-decoration in the table
      const lineDecorationRows = tableRef.current?.querySelectorAll(
        "tr.line-decoration",
      ) as NodeListOf<HTMLTableRowElement>;
      for (const row of Array.from(lineDecorationRows)) {
        const container = row.querySelector(
          ".line-decoration-container",
        ) as HTMLDivElement | null;

        if (!container) return;

        // Match the container's width to the table width
        // (minus 2px to account for the border)
        container.style.width = `${tableWidth}px`;

        // Also force the row’s height to match the container’s height
        // (because container is absolutely-positioned)
        const containerHeight = container.clientHeight;
        row.style.height = `${containerHeight}px`;
      }
    });

    // Observe the table for size changes
    resizeObserver.observe(tableRef.current);

    // Cleanup on unmount
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

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

  return (
    <div
      id={id}
      style={style}
      className={["ds git-diff-viewer", className].filter(Boolean).join(" ")}
    >
      <div className="diff-file">
        {diff.hunks.map((hunk, hunkIndex) => {
          // We'll track the counters for old and new lines
          // as we iterate through each hunk.
          let oldLineCounter = hunk.oldStart;
          let newLineCounter = hunk.newStart;

          return (
            <div key={`${diff.oldPath}-${hunkIndex}`} className="diff-hunk">
              <table className="diff-table" ref={tableRef}>
                <tbody>
                  {/* Hunk header line */}
                  <DiffLine
                    type="hunk"
                    hunkHeader={hunk.header}
                    wrapLines={wrapLines}
                  />

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

                    // For rendering, if lineNum1 or lineNum2 is null,
                    // you can display e.g. '+' or '-' or an empty cell.
                    return (
                      <React.Fragment
                        key={`${diff.oldPath}-${hunkIndex}-${lineIndex}`}
                      >
                        {/* Normal diff line */}
                        <DiffLine
                          lineNum1={lineNum1 ?? "+"}
                          lineNum2={lineNum2 ?? "-"}
                          content={line.content}
                          type={line.type}
                          language={getLanguage(diff.newPath)}
                          wrapLines={wrapLines}
                          onCommentOpen={
                            AddComment
                              ? () =>
                                  setOpenComment((prev) =>
                                    prev === (lineNum2 || lineNum1)
                                      ? null
                                      : lineNum2 || lineNum1,
                                  )
                              : undefined
                          }
                        />

                        {lineDecorations?.[lineNum2 || lineNum1 || 0] && (
                          <tr
                            className="line-decoration"
                            ref={(el) => {
                              decorationRefs.current[
                                lineNum2 || lineNum1 || 0
                              ] = el;
                            }}
                          >
                            <td className="line-decoration-placeholder">
                              &nbsp;
                            </td>
                            <td
                              className="line-decoration-container"
                              style={{ position: "absolute" }}
                            >
                              {lineDecorations[lineNum2 || lineNum1 || 0]}
                            </td>
                          </tr>
                        )}

                        {/* Open comment row, if any */}
                        {openComment &&
                          openComment === lineNum2 &&
                          AddComment && (
                            <tr
                              ref={(el) => {
                                decorationRefs.current[-1] = el;
                              }}
                              className="line-decoration"
                            >
                              <td className="line-decoration-placeholder">
                                &nbsp;
                              </td>
                              <td className="line-decoration-container">
                                <AddComment
                                  lineNumber={openComment}
                                  onClose={() => setOpenComment(null)}
                                />
                              </td>
                            </tr>
                          )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GitDiffViewer;
