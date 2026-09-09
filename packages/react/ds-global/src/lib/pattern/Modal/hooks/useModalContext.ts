import { useContext } from "react";
import Context from "../Context.js";
import type { ModalContextValue } from "../types.js";

/** Reads the shared modal API. Throws if used outside a Modal. */
export const useModalContext = (): ModalContextValue => {
  const value = useContext(Context);
  if (!value) {
    throw new Error("useModalContext must be used within a Modal.");
  }
  return value;
};
