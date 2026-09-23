import type { RefObject } from "react";
import { useCallback, useId, useMemo } from "react";
import type { SidePanelContextValue } from "../types.js";

/**
 * Build the value the provider puts on its context for the composed
 * subcomponents: the id the header's title carries so it can name the panel,
 * and the `close` action the header's close button calls.
 *
 * It holds no state of its own — the dialog's native open state stays the
 * only source of truth. The value is memoised so consumers of the context do
 * not re-render every time the provider does.
 */
const useSidePanelContextValue = (
  dialogRef: RefObject<HTMLDialogElement | null>,
): SidePanelContextValue => {
  const titleId = useId();
  const close = useCallback(() => {
    dialogRef.current?.close();
  }, [dialogRef]);
  return useMemo(() => ({ close, titleId }), [close, titleId]);
};

export default useSidePanelContextValue;
