/* @canonical/generator-canonical-ds 0.0.1 */
import type React from "react";
import {
  Fragment,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import { highlightDiffHunkLines } from "ui/GitDiffViewer/utils/index.js";
import { useGitDiffViewer } from "../../hooks/index.js";
import { DiffLine } from "./common/index.js";
import "./HighlighTheme.css";
import "./styles.css";
import type { CodeDiffViewerProps } from "./types.js";

import { DiffLineRegion } from "./common/DiffLineRegion/index.js";
import updateTableWidth from "./utils/updateTableWidth.js";

const componentCssClassName = "ds code-diff-viewer";

/**
 * Displays a diff in a table format with line numbers and syntax highlighting.
 * With option to add comments to specific lines and interactive gutter for adding comments.
 *
 * @returns {React.ReactElement} - Rendered CodeDiffViewer
 */
const CodeDiffViewer = (
  {
    id,
    AddComment,
    onLineClick,
    className,
    style,
    disableWidthCalculation = false,
  }: CodeDiffViewerProps,
  ref: React.Ref<HTMLTableElement>,
): React.ReactElement | null => {
  const { isCollapsed, diff } = useGitDiffViewer();
  const tableRef = useRef<HTMLTableElement>(null);

  const highlightedLines: string[][] = useMemo(() => {
    if (!diff) return [];

    return diff.hunks.map((hunk) => highlightDiffHunkLines(hunk.lines));
  }, [diff]);

  useImperativeHandle<HTMLTableElement | null, HTMLTableElement | null>(
    ref,
    () => tableRef.current,
  );

  /**
   * Observe the table for size changes and update the CSS variable
   */
  useEffect(() => {
    // SSR check
    if (typeof ResizeObserver === "undefined") return;
    if (disableWidthCalculation) return;
    if (!tableRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      if (!tableRef.current) return;
      updateTableWidth(tableRef.current);
    });

    resizeObserver.observe(tableRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [disableWidthCalculation]);

  return (
    <div
      id={id}
      style={style}
      className={[componentCssClassName, className, isCollapsed && "collapsed"]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="diff-hunk">
        <table className="diff-table" ref={tableRef} tabIndex={-1}>
          <tbody>
            {diff.hunks.map((hunk, hunkIndex) => {
              // We'll track the counters for old and new lines
              // as we iterate through each hunk.
              let oldLineCounter = hunk.oldStart;
              let newLineCounter = hunk.newStart;

              return (
                <Fragment key={`${diff.oldPath}-${hunkIndex}`}>
                  {/* Hunk header line */}
                  <DiffLine
                    type="hunk"
                    hunkHeader={hunk.header}
                    hunkIndex={hunkIndex}
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
                      // Normal diff line
                      <DiffLineRegion
                        key={`${diff.oldPath}-${hunkIndex}-${lineIndex}`}
                        lineNum1={lineNum1}
                        lineNum2={lineNum2}
                        content={highlightedLines[hunkIndex][lineIndex]}
                        type={line.type}
                        diffLineNumber={hunk.diffStart + lineIndex}
                        onLineClick={onLineClick}
                        AddComment={AddComment}
                      />
                    );
                  })}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

CodeDiffViewer.displayName = "GitDiffViewer.CodeDiff";

export default forwardRef(CodeDiffViewer);
