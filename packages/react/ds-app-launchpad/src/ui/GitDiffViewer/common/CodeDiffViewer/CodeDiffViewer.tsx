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
import { useGitDiffViewer } from "../../hooks/index.js";
import { highlightDiffHunkLines } from "../../utils/index.js";
import { DiffLine } from "./common/index.js";
import "./HighlighTheme.css";
import "./styles.css";
import * as icons from "./common/icons.js";
import type { CodeDiffViewerProps } from "./types.js";

import { AnnotatedDiffLine } from "./common/AnnotatedDiffLine/index.js";
import { tableWidthCSSVar } from "./constants.js";

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
    if (disableWidthCalculation || isCollapsed) return;
    if (!tableRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      if (!tableRef.current) return;
      tableRef.current.style.cssText = `${tableWidthCSSVar}: ${tableRef.current.clientWidth}px`;
    });

    resizeObserver.observe(tableRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [disableWidthCalculation, isCollapsed]);

  if (isCollapsed) return null;

  return (
    <div
      id={id}
      style={style}
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
    >
      <div className="diff-hunk">
        <table className="diff-table" ref={tableRef} tabIndex={-1}>
          <tbody>
            {diff.hunks.map((hunk, hunkIndex) => {
              // We'll track the counters for old and new lines
              // as we iterate through each hunk.
              let oldLineCounter = hunk.positions.old.start;
              let newLineCounter = hunk.positions.new.start;

              return (
                <Fragment key={`${diff.oldPath}-${hunkIndex}`}>
                  <DiffLine
                    type="hunk"
                    hunkHeader={hunk.header}
                    hunkIndex={hunkIndex}
                  />

                  {hunk.lines.map((line, lineIndex) => {
                    const newLineNumber = newLineCounter;
                    const oldLineNumber = oldLineCounter;

                    if (line.type === "remove") {
                      oldLineCounter++;
                    } else if (line.type === "add") {
                      newLineCounter++;
                    } else {
                      oldLineCounter++;
                      newLineCounter++;
                    }

                    return (
                      <AnnotatedDiffLine
                        key={`${diff.oldPath}-${hunkIndex}-${lineIndex}`}
                        newLineNumber={newLineNumber}
                        oldLineNumber={oldLineNumber}
                        diffLineNumber={hunk.positions.diff.start + lineIndex}
                        content={highlightedLines[hunkIndex][lineIndex]}
                        type={line.type}
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
      <div className="svg-refs">{icons.CommentIcon}</div>
    </div>
  );
};

CodeDiffViewer.displayName = "GitDiffViewer.CodeDiff";

export default forwardRef(CodeDiffViewer);
