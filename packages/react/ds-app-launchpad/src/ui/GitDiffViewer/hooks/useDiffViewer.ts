import { useContext } from "react";
import Context from "../Context.js";

const useDiffViewer = () => {
  const context = useContext(Context);
  if (!context) {
    throw new Error(
      "useDiffViewer must be used within a DiffViewerProvider or GitDiffViewer component",
    );
  }
  return context;
};

export default useDiffViewer;
