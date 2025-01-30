import { useContext } from "react";
import { DiffViewerContext } from "../Context.js";

export const useDiffViewer = () => {
  const context = useContext(DiffViewerContext);
  if (!context) {
    throw new Error(
      "useDiffViewer must be used within a DiffViewerProvider or GitDiffViewer component",
    );
  }
  return context;
};
