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

/**
 * Manages the state of a popup.
 * @param isOpen An override for the open state.
 * @param deactivateDelay The delay in milliseconds before setting the flag to false.
 * @param activateDelay The delay in milliseconds before setting the flag to true.
 * @param onEnter A callback to be called when the mouse enters the target element.
 * @param onLeave A callback to be called when the mouse leaves the target element.
 * @param onFocus A callback to be called when the target element is focused.
 * @param onBlur A callback to be called when the target element loses focus.
 * @param onShow A callback to be called when the popup is shown.
 * @param onHide A callback to be called when the popup is hidden.
 * @param props The props to be passed to the useWindowFitment hook.
 * @returns The current state of the popup, and event handlers for the target element.
 */
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
