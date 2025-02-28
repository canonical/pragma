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
  isOpen: isOpenProp,
  deactivateDelay,
  activateDelay,
  onEnter,
  onLeave,
  onFocus,
  onBlur,
  onShow,
  onHide,
  ...props
}: UsePopupProps): UsePopupResult => {
  const [isFocused, setIsFocused] = useState(false);
  const popupId = useId();

  const {
    flag: isOpenHook,
    deactivate: close,
    activate: open,
  } = useDelayedToggle({
    activateDelay,
    deactivateDelay,
    onActivate: onShow,
    onDeactivate: onHide,
  });

  // Apply open override
  const isOpen = typeof isOpenProp === "boolean" ? isOpenProp : isOpenHook;

  const { targetRef, popupRef, bestPosition, popupPositionStyle } =
    useWindowFitment({
      ...props,
      isOpen: isOpen,
    });

  const handleTriggerFocus: FocusEventHandler = useCallback(
    (event) => {
      setIsFocused(true);
      open(event.nativeEvent);
      if (onFocus) onFocus(event);
    },
    [open, onFocus],
  );

  const handleTriggerBlur: FocusEventHandler = useCallback(
    (event) => {
      setIsFocused(false);
      close(event.nativeEvent);
      if (onBlur) onBlur(event);
    },
    [close, onBlur],
  );

  const handleTriggerEnter: PointerEventHandler = useCallback(
    (event) => {
      console.log("usePopup handleTriggerEnter");
      open(event.nativeEvent);
      if (onEnter) onEnter(event);
    },
    [open, onEnter],
  );

  const handleTriggerLeave: PointerEventHandler = useCallback(
    (event) => {
      console.log("usePopup handleTriggerLeave");
      close(event.nativeEvent);
      if (onLeave) onLeave(event);
    },
    [close, onLeave],
  );

  return {
    handleTriggerBlur,
    handleTriggerEnter,
    handleTriggerFocus,
    handleTriggerLeave,
    isFocused,
    isOpen,
    popupId,
    popupRef,
    targetRef,
    bestPosition,
    popupPositionStyle,
  };
};

export default usePopup;
