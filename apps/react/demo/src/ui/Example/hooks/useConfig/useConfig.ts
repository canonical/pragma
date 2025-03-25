import { useContext } from "react";
import Context from "../../Context.js";
import type { ProviderValue } from "../../types.js";

/**
 * Hook to access the config object from the nearest ConfigProvider.
 */
const useConfig = (): ProviderValue => {
  const context = useContext(Context);
  if (!context) {
    throw new Error("useConfig.ts must be used within a ConfigProvider");
  }
  return context;
};

export default useConfig;
