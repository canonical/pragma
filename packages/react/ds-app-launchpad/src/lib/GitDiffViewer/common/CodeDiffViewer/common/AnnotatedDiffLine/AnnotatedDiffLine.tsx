/* @canonical/generator-ds 0.9.0-experimental.12 */
import type React from "react";
import { useCallback, useMemo } from "react";
import { useGitDiffViewer } from "../../../../hooks/index.js";
import DiffLine from "../DiffLine/DiffLine.js";
import "./styles.css";
import type { AnnotatedDiffLineProps } from "./types.js";

const componentCssClassName = "ds annotated-diff-line";

/**
 * A component that displays a diff line content, line decorations and AddComment component.
 * @returns {React.ReactElement} - Rendered AnnotatedDiffLine
 */
const AnnotatedDiffLine = ({
  newLineNumber,
  oldLineNumber,
  diffLineNumber,
  AddComment,
  onLineClick,
  type,
  ...rest
}: AnnotatedDiffLineProps): React.ReactElement => {
  const { addCommentOpenLocations, toggleAddCommentLocation, lineDecorations } =
    useGitDiffViewer();

  const diffLineIsInteractive = Boolean(onLineClick || AddComment);

  const hunkLineNumber = useMemo(() => {
    return type === "add" ? newLineNumber : oldLineNumber;
  }, [type, newLineNumber, oldLineNumber]);

  const handleLineClick = useCallback(() => {
    if (diffLineIsInteractive) {
      onLineClick?.({
        hunkLineNumber,
        diffLineNumber,
      });
      toggleAddCommentLocation(diffLineNumber);
    }
  }, [
    onLineClick,
    diffLineNumber,
    hunkLineNumber,
    toggleAddCommentLocation,
    diffLineIsInteractive,
  ]);

  const handleCloseComment = useCallback(() => {
    toggleAddCommentLocation(diffLineNumber);
  }, [toggleAddCommentLocation, diffLineNumber]);

  return (
    <>
      <DiffLine
        {...rest}
        type={type}
        addLineNumber={newLineNumber}
        removeLineNumber={oldLineNumber}
        onLineClick={diffLineIsInteractive ? handleLineClick : undefined}
      />
      {lineDecorations?.[diffLineNumber] && (
        <tr className={componentCssClassName}>
          <td className="container">{lineDecorations[diffLineNumber]}</td>
        </tr>
      )}
      {/* Open comment row, if any */}
      {AddComment && addCommentOpenLocations.has(diffLineNumber) && (
        <tr className={componentCssClassName}>
          <td className="container">
            <AddComment
              hunkLineNumber={hunkLineNumber}
              diffLineNumber={diffLineNumber}
              onClose={handleCloseComment}
            />
          </td>
        </tr>
      )}
    </>
  );
};

export default AnnotatedDiffLine;
