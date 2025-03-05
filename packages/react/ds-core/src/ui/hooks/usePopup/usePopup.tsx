import {
  type FocusEventHandler,
  type PointerEventHandler,
  useCallback,
  useId,
} from "react";
import { useState } from "react";
import { useDelayedToggle } from "../useDelayedToggle/index.js";
import { useWindowFitment } from "../useWindowFitment/index.js";
import type { UsePopupProps, UsePopupResult } from "./types.js";

const usePopup = ({
  isOpenOverride,
  deactivateDelay,
  activateDelay,
  ...props
}: UsePopupProps): UsePopupResult => {
  const [isFocused, setIsFocused] = useState(false);
  const popupId = useId();

  const {
    flag: isOpenHook,
    deactivate: close,
    activate: open,
  } = useDelayedToggle({ activateDelay, deactivateDelay });
  // Apply open override
  const isOpen =
    typeof isOpenOverride === "boolean" ? isOpenOverride : isOpenHook;

  const { targetRef, popupRef, bestPosition, popupPositionStyle } =
    useWindowFitment({
      ...props,
      isVisible: isOpen,
    });

  const handleTriggerFocus: FocusEventHandler = useCallback(
    (event) => {
      setIsFocused(true);
      !isOpenHook && open();
    },
    [isOpenHook, open],
  );

  const handleTriggerBlur: FocusEventHandler = useCallback(
    (event) => {
      setIsFocused(false);
      close();
    },
    [close],
  );

  const handleTriggerEnter: PointerEventHandler = useCallback(
    (event) => {
      console.log("usePopup handleTriggerEnter");
      open();
    },
    [open],
  );

  const handleTriggerLeave: PointerEventHandler = useCallback(
    (event) => {
      console.log("usePopup handleTriggerLeave");
      close();
    },
    [close],
  );

  return {
    isFocused,
    handleTriggerBlur,
    handleTriggerEnter,
    handleTriggerFocus,
    handleTriggerLeave,
    isOpen,
    popupId,
    popupRef,
    targetRef,
    bestPosition,
    popupPositionStyle,
  };
};

export default usePopup;
