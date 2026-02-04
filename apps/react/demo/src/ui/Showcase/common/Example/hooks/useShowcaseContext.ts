import { useContext } from "react";
import Context from "../Context.js";
import type { ContextOptions } from "../types.js";

/**
 * Hook to access the config object from the nearest ConfigProvider.
 */
const useShowcaseContext = (): ContextOptions => {
  const context = useContext(Context);
  if (!context) {
    throw new Error("useShowcaseContext must be used within a ConfigProvider");
  }
  return context;
};

export default useShowcaseContext;
