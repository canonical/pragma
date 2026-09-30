import type { RefObject } from "react";
import { useCallback, useId } from "react";
import type { ModalContextValue } from "../types.js";

/**
 * The provider state threaded to the composed subcomponents: the id that names
 * the dialog, and the dismissal that closes it. Centralising it here keeps the
 * provider free of state logic.
 */
const useModalState = (
  dialogRef: RefObject<HTMLDialogElement | null>,
): ModalContextValue => {
  const titleId = useId();
  const onDismiss = useCallback(() => {
    dialogRef.current?.close();
  }, [dialogRef]);
  return { titleId, onDismiss };
};

export default useModalState;
