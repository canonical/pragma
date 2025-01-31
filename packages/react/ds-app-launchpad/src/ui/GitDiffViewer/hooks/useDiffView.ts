import { useContext } from "react";
import { GitDiffViewerContext } from "../Context.js";

export const useDiffViewer = () => {
  const context = useContext(GitDiffViewerContext);
  if (!context) {
    throw new Error(
      "useDiffViewer must be used within a DiffViewerProvider or GitDiffViewer component",
    );
  }
  return context;
};
