import { useContext } from "react";
import Context, { rootLevelEmptyContext } from "../Context.js";

const useNode = () => {
  const context = useContext(Context);
  if (!context) {
    // if no folder parent is found, that means file is at root level
    return rootLevelEmptyContext;
  }
  return context;
};

export default useNode;
