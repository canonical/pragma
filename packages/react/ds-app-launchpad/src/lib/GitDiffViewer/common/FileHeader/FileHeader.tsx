/* @canonical/generator-canonical-ds 0.0.1 */
import type React from "react";
import { useCallback } from "react";
import { useGitDiffViewer } from "../../hooks/index.js";
import "./styles.css";
import { DiffChangeMarker } from "../../../index.js";
import type { FileHeaderProps } from "./types.js";

const componentCssClassName = "ds file-header";

/**
 * Displays the file name and change count for a diff.
 * With option to add custom elements to the left and right of the file header.
 *
 * @returns {React.ReactElement} - Rendered FileHeader
 */
const FileHeader = ({
  id,
  children,
  className,
  style,
  hideCollapse = false,
  showChangeCount,
  leftContent,
  rightContent,
  ...props
}: FileHeaderProps): React.ReactElement => {
  const { isCollapsed, onCollapseToggle, diff } = useGitDiffViewer();
  const shouldRenderCollapse = !hideCollapse && isCollapsed !== undefined;

  const calculateChangeCount = useCallback(() => {
    let additions = 0;
    let deletions = 0;
    for (const hunk of diff.hunks) {
      for (const line of hunk.lines) {
        if (line.type === "add") {
          additions++;
        } else if (line.type === "remove") {
          deletions++;
        }
      }
    }
    return { additions, deletions };
  }, [diff]);
  const changesCount = calculateChangeCount();
  return (
    <div
      id={id}
      style={style}
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      {...props}
    >
      <div className="left-content">
        {leftContent}
        {shouldRenderCollapse && (
          <button
            className={`collapse-button ${isCollapsed ? "collapsed" : ""}`}
            onClick={() => onCollapseToggle(!isCollapsed)}
            aria-label="Collapse file"
            type="button"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <title>Collapse</title>
              <path
                d="M11.811 8.124L5.62399 1.937L4.56299 2.997L9.68999 8.124L4.56299 13.25L5.62399 14.311L11.811 8.124Z"
                fill="currentColor"
              />
            </svg>
          </button>
        )}
        {<h5 className="file-name">{diff.newPath}</h5>}
      </div>
      <div className="right-content">
        {showChangeCount && (
          <div className="change-count">
            {diff.fileChangeState === "modified" ? (
              <DiffChangeMarker
                additions={changesCount.additions}
                deletions={changesCount.deletions}
                markerStyle="detailed"
              />
            ) : (
              diff.fileChangeState !== "none" && (
                <DiffChangeMarker
                  type={diff.fileChangeState}
                  markerStyle="detailed"
                />
              )
            )}
          </div>
        )}
        {rightContent}
      </div>
      {children}
    </div>
  );
};

FileHeader.displayName = "GitDiffViewer.FileHeader";

export default FileHeader;
