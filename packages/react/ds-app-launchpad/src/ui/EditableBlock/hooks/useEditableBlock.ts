import { useContext } from "react";
import EditingContext from "../Context.js";
import type { EditingContextType } from "../types.js";

export const useEditableBlocks = (): EditingContextType => {
  const context = useContext(EditingContext);
  if (!context) {
    throw new Error("useEditing cannot be used directly.");
  }
  return context;
};
