import { type FocusEventHandler, useId } from "react";
import { useState } from "react";
import { useDelayedOpen } from "../../../../hooks/useDelayedOpen/index.js";
import { useFittedPopup } from "../../../../hooks/useFittedPopup/index.js";
import type { UseTooltipProps, UseTooltipResult } from "./types.js";

const useTooltip = <TTriggerElement extends HTMLElement = HTMLElement>({
  isOpenOverride,
  showDelay,
  hideDelay,
  ...props
}: UseTooltipProps): UseTooltipResult => {
  const [isFocused, setIsFocused] = useState(false);
  const messageId = useId();
  const { targetRef, messageRef, messageStyle } = useFittedPopup(props);
  const {
    isVisible: isOpenHook,
    open,
    close,
  } = useDelayedOpen({ showDelay, hideDelay });

  const handleTriggerFocus: FocusEventHandler<TTriggerElement> = (event) => {
    setIsFocused(true);
    !isOpenHook && open();
  };

  const handleTriggerBlur: FocusEventHandler<TTriggerElement> = (event) => {
    setIsFocused(false);
    close();
  };

  const handleTriggerEnter = () => {
    console.log("usetooltip handleTriggerEnter");
    open();
  };

  const handleTriggerLeave = () => {
    console.log("usetooltip handleTriggerLeave");
    close();
  };

  return {
    isFocused,
    handleTriggerBlur,
    handleTriggerEnter,
    handleTriggerFocus,
    handleTriggerLeave,
    // Apply open override
    isOpen: typeof isOpenOverride === "boolean" ? isOpenOverride : isOpenHook,
    messageId,
    messageRef,
    messageStyle,
    targetRef,
  };
};

export default useTooltip;
