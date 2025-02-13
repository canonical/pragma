import { useCallback, useMemo, useState } from "react";
import Context from "./Context.js";
import "./styles.css";
import type { ContextOptions, ProviderOptions } from "./types.js";

const componentCssClassName = "ds git-diff-viewer";

const Provider = ({
  id,
  className,
  style,
  children,
  diff,
  collapsed,
  onCollapseToggle,
  lineDecorations,
  onLineDecorationsChange,
  wrapLines,
  onWrapLinesToggle,
}: ProviderOptions): React.ReactElement => {
  const [internalIsCollapsed, setInternalIsCollapsed] =
    useState<ContextOptions["isCollapsed"]>(false);
  const [internalWrapLines, setInternalWrapLines] =
    useState<ContextOptions["wrapLines"]>(false);
  const [internalDiff, setInternalDiff] = useState<ContextOptions["diff"]>();
  const [internalLineDecorations, setInternalLineDecorations] = useState<
    ContextOptions["lineDecorations"]
  >({});
  const [addCommentLocations, setAddCommentLocations] = useState<
    ContextOptions["addCommentLocations"]
  >(new Set());
  const [addCommentEnabled, setAddCommentEnabled] =
    useState<ContextOptions["addCommentEnabled"]>(false);

  const currentIsCollapsed = useMemo(
    () => collapsed ?? internalIsCollapsed,
    [collapsed, internalIsCollapsed],
  );
  const currentWrapLines = useMemo(
    () => wrapLines ?? internalWrapLines,
    [wrapLines, internalWrapLines],
  );
  const currentDiff = useMemo(() => diff ?? internalDiff, [diff, internalDiff]);
  const currentLineDecorations = useMemo(
    () => lineDecorations ?? internalLineDecorations,
    [lineDecorations, internalLineDecorations],
  );

  const toggleCollapse = useCallback(() => {
    if (collapsed !== undefined) {
      onCollapseToggle?.(!currentIsCollapsed);
    } else {
      setInternalIsCollapsed((prev) => !prev);
    }
  }, [collapsed, onCollapseToggle, currentIsCollapsed]);

  const toggleWrapLines = useCallback(() => {
    if (wrapLines !== undefined) {
      onWrapLinesToggle?.(!currentWrapLines);
    } else {
      setInternalWrapLines((prev) => !prev);
    }
  }, [wrapLines, onWrapLinesToggle, currentWrapLines]);

  const toggleAddCommentLocation = useCallback((lineNumber: number) => {
    setAddCommentLocations((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(lineNumber)) {
        newSet.delete(lineNumber);
      } else {
        newSet.add(lineNumber);
      }
      return newSet;
    });
  }, []);

  const handleLineDecorationsChange = useCallback(
    (newLineDecorations: Record<number, React.ReactElement>) => {
      if (lineDecorations !== undefined) {
        onLineDecorationsChange?.(currentLineDecorations);
      } else {
        setInternalLineDecorations(newLineDecorations);
      }
    },
    [lineDecorations, onLineDecorationsChange, currentLineDecorations],
  );

  return (
    <Context.Provider
      value={{
        diff: currentDiff,
        isCollapsed: currentIsCollapsed,
        toggleCollapse,
        wrapLines: currentWrapLines,
        toggleWrapLines,
        setDiff: setInternalDiff,
        lineDecorations: currentLineDecorations,
        setLineDecorations: handleLineDecorationsChange,
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
    </Context.Provider>
  );
};

export default Provider;
