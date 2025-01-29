/* @canonical/generator-canonical-ds 0.0.1 */
import { createContext, useContext, useState } from "react";
import type {
  DiffViewerContextType,
  DiffViewerProviderProps,
} from "./types.js";

export const DiffViewerContext = createContext<DiffViewerContextType | null>(
  null,
);

export const DiffViewerProvider = ({
  children,
  ...externalState
}: DiffViewerProviderProps) => {
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

  const isCollapsed = externalState.collapsed ?? internalIsCollapsed;
  const wrapLines = externalState.wrapLines ?? internalWrapLines;
  const diff = externalState.diff ?? internalDiff;
  const lineDecorations =
    externalState.lineDecorations ?? internalLineDecorations;

  const toggleCollapse = () => {
    if (externalState.collapsed !== undefined) {
      externalState.onCollapseToggle?.(!isCollapsed);
    } else {
      setInternalIsCollapsed((prev) => !prev);
    }
  };

  const toggleWrapLines = () => {
    if (externalState.wrapLines !== undefined) {
      externalState.onWrapLinesToggle?.(!wrapLines);
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
    if (externalState.lineDecorations !== undefined) {
      externalState.onLineDecorationsChange?.(newLineDecorations);
    } else {
      setInternalLineDecorations(newLineDecorations);
    }
  };

  return (
    <DiffViewerContext.Provider
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
      {children}
    </DiffViewerContext.Provider>
  );
};

export const useDiffViewer = () => {
  const context = useContext(DiffViewerContext);
  if (!context) {
    throw new Error(
      "useDiffViewer must be used within a DiffViewerProvider or GitDiffViewer component",
    );
  }
  return context;
};
