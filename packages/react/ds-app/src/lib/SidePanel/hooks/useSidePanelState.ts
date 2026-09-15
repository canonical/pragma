import type { RefObject } from "react";
import { useCallback, useId } from "react";
import type { SidePanelContextValue } from "../types.js";

/**
 * The provider state threaded to the composed subcomponents: the id that names
 * the panel, and the dismissal that closes it. Centralising it here keeps the
 * provider free of state logic.
 */
const useSidePanelState = (
  dialogRef: RefObject<HTMLDialogElement | null>,
): SidePanelContextValue => {
  const titleId = useId();
  const close = useCallback(() => {
    dialogRef.current?.close();
  }, [dialogRef]);
  return { close, titleId };
};

export default useSidePanelState;
