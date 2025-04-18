/* @canonical/generator-ds 0.9.0-experimental.12 */
import type React from "react";
import type { DiffLineRegionProps } from "./types.js";
import "./styles.css";
import { useCallback } from "react";
import { useGitDiffViewer } from "../../../../hooks/index.js";
import DiffLine from "../DiffLine/DiffLine.js";

/**
 * A component that displays a diff line content, line decorations and AddComment component.
 * @returns {React.ReactElement} - Rendered DiffLineRegion
 */
const DiffLineRegion = ({
  lineNum1,
  lineNum2,
  diffLineNumber,
  AddComment,
  onLineClick,
  ...rest
}: DiffLineRegionProps): React.ReactElement => {
  const { addCommentOpenLocations, toggleAddCommentLocation, lineDecorations } =
    useGitDiffViewer();

  const lineNumber = Number(lineNum2 || lineNum1 || 0);
  const diffLineIsInteractive = Boolean(onLineClick || AddComment);

  const handleLineClick = useCallback(() => {
    if (diffLineIsInteractive) {
      onLineClick?.({ lineNumber, diffLineNumber });
      toggleAddCommentLocation(lineNumber);
    }
  }, [
    onLineClick,
    lineNumber,
    diffLineNumber,
    toggleAddCommentLocation,
    diffLineIsInteractive,
  ]);

  const handleCloseComment = useCallback(() => {
    toggleAddCommentLocation(lineNumber);
  }, [toggleAddCommentLocation, lineNumber]);

  return (
    <>
      <DiffLine
        {...rest}
        lineNum1={lineNum1}
        lineNum2={lineNum2}
        onLineClick={diffLineIsInteractive ? handleLineClick : undefined}
      />
      {lineNum2 && lineDecorations?.[lineNum2] && (
        <tr className="line-decoration">
          <td className="container">{lineDecorations[lineNum2]}</td>
        </tr>
      )}
      {/* Open comment row, if any */}
      {lineNum2 && AddComment && addCommentOpenLocations.has(lineNum2) && (
        <tr className="line-decoration">
          <td className="container">
            <AddComment
              lineNumber={lineNumber}
              diffLineNumber={diffLineNumber}
              onClose={handleCloseComment}
            />
          </td>
        </tr>
      )}
    </>
  );
};

export default DiffLineRegion;
