import { useState } from "react";
import { GitDiffViewerContext } from "./Context.js";
import { CodeDiffViewer, FileHeader } from "./common/index.js";
import "./style.css";
import type { DiffViewerContextType, GitDiffViewerType } from "./types.js";

const componentCssClassName = "ds git-diff-viewer";

const GitDiffViewer: GitDiffViewerType = ({
  id,
  className,
  style,
  children,
  ...props
}) => {
  const [internalIsCollapsed, setInternalIsCollapsed] =
    useState<DiffViewerContextType["isCollapsed"]>(false);
  const [internalWrapLines, setInternalWrapLines] =
    useState<DiffViewerContextType["wrapLines"]>(false);
  const [internalDiff, setInternalDiff] =
    useState<DiffViewerContextType["diff"]>();
  const [internalLineDecorations, setInternalLineDecorations] = useState<
    DiffViewerContextType["lineDecorations"]
  >({});
  const [addCommentLocations, setAddCommentLocations] = useState<
    DiffViewerContextType["addCommentLocations"]
  >(new Set());
  const [addCommentEnabled, setAddCommentEnabled] =
    useState<DiffViewerContextType["addCommentEnabled"]>(false);

  const isCollapsed = props.collapsed ?? internalIsCollapsed;
  const wrapLines = props.wrapLines ?? internalWrapLines;
  const diff = props.diff ?? internalDiff;
  const lineDecorations = props.lineDecorations ?? internalLineDecorations;

  const toggleCollapse = () => {
    if (props.collapsed !== undefined) {
      props.onCollapseToggle?.(!isCollapsed);
    } else {
      setInternalIsCollapsed((prev) => !prev);
    }
  };

  const toggleWrapLines = () => {
    if (props.wrapLines !== undefined) {
      props.onWrapLinesToggle?.(!wrapLines);
    } else {
      setInternalWrapLines((prev) => !prev);
    }
  };

  const toggleAddCommentLocation = (lineNumber: number) => {
    setAddCommentLocations((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(lineNumber)) {
        newSet.delete(lineNumber);
      } else {
        newSet.add(lineNumber);
      }
      return newSet;
    });
  };

  const onLineDecorationsChange = (
    newLineDecorations: Record<number, React.ReactElement>,
  ) => {
    if (props.lineDecorations !== undefined) {
      props.onLineDecorationsChange?.(newLineDecorations);
    } else {
      setInternalLineDecorations(newLineDecorations);
    }
  };
  return (
    <GitDiffViewerContext.Provider
      value={{
        diff,
        isCollapsed: isCollapsed,
        toggleCollapse,
        wrapLines: wrapLines,
        toggleWrapLines,
        setDiff: setInternalDiff,
        lineDecorations,
        setLineDecorations: onLineDecorationsChange,
        addCommentLocations,
        toggleAddCommentLocation,
        addCommentEnabled,
        setAddCommentEnabled,
      }}
    >
      <div
        id={id}
        style={style}
        className={[componentCssClassName, className].filter(Boolean).join(" ")}
      >
        {children}
      </div>
    </GitDiffViewerContext.Provider>
  );
};

GitDiffViewer.CodeDiff = CodeDiffViewer;
GitDiffViewer.FileHeader = FileHeader;

export default GitDiffViewer;
