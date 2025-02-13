import { useContext } from "react";
import Context from "../Context.js";

const useGitDiffViewer = () => {
  const context = useContext(Context);
  if (!context) {
    throw new Error(
      "useGitDiffViewer must be used within a DiffViewerProvider or GitDiffViewer component",
    );
  }
  return context;
};

export default useGitDiffViewer;
