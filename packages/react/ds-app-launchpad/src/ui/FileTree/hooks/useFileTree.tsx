import { useContext } from "react";
import Context from "../Context.js";

const useFileTree = () => {
  const context = useContext(Context);
  if (!context) {
    throw new Error(
      "useFileTree must be used within a DiffViewerProvider or GitDiffViewer component",
    );
  }
  return context;
};

export default useFileTree;
