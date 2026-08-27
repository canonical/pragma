import { createContext, useContext } from "react";

/**
 * The shared modal API threaded to the composed subcomponents. There is ONE
 * modal instance per dialog — the subcomponents are render-only and read this
 * context rather than being handed props, so a composed `Modal.Header` names
 * the dialog and closes it without the consumer wiring either by hand.
 */
export interface ModalContextValue {
  /**
   * The id the dialog's `aria-labelledby` points at. The Header sets it on the
   * title, which is what gives the dialog its accessible name.
   */
  titleId: string;
  /** Requests dismissal — reports `false` through the modal's `onOpenChange`. */
  onDismiss: () => void;
}

const ModalContext = createContext<ModalContextValue | null>(null);

/** Read the shared modal API. Throws if used outside a Modal. */
export const useModalContext = (): ModalContextValue => {
  const value = useContext(ModalContext);
  if (!value) {
    throw new Error("useModalContext must be used within a Modal.");
  }
  return value;
};

export default ModalContext;
