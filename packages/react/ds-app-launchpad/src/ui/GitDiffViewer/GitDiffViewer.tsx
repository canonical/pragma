import CodeDiffViewer from "./CodeDiffViewer/CodeDiffViewer.js";
import { DiffViewerProvider } from "./DiffViewerContext/DiffViewerContext.js";
import FileHeader from "./FileHeader/FileHeader.js";
import "./GitDiffViewer.css";
import type { GitDiffViewerType } from "./types.js";
const componentCssClassName = "ds git-diff-viewer";

const GitDiffViewer: GitDiffViewerType = ({
  id,
  className,
  style,
  children,
  ...props
}) => {
  return (
    <DiffViewerProvider {...props}>
      <div
        id={id}
        style={style}
        className={[componentCssClassName, className].filter(Boolean).join(" ")}
      >
        {children}
      </div>
    </DiffViewerProvider>
  );
};

GitDiffViewer.CodeDiff = CodeDiffViewer;
GitDiffViewer.FileHeader = FileHeader;

export default GitDiffViewer;
