import { useState } from "react";
import Context from "./Context.js";
import "./styles.css";
import type { ContextOptions, ProviderOptions } from "./types.js";

const componentCssClassName = "ds git-diff-viewer";

const Provider = ({
  id,
  className,
  style,
  children,
  ...props
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
    <Context.Provider
      value={{
        diff,
        isCollapsed,
        toggleCollapse,
        wrapLines,
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
    </Context.Provider>
  );
};

export default Provider;
