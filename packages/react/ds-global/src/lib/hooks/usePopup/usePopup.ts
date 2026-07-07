import { useDisclosure } from "../useDisclosure/index.js";
import type { UsePopupProps, UsePopupResult } from "./types.js";

const noop = () => {};

/**
 * Manages the state of a hover popup.
 *
 * @deprecated Use {@link useDisclosure} with `mode: "hover"` instead. `usePopup`
 * is a thin backwards-compatible wrapper retained for existing tooltip consumers
 * and will be removed once they migrate.
 *
 * @param props The props for the underlying disclosure.
 * @returns The current state of the popup, and event handlers for the target element.
 */
const usePopup = (props: UsePopupProps): UsePopupResult => {
  const {
    isOpen,
    isFocused,
    targetRef,
    popupRef,
    popupPositionStyle,
    popupId,
    bestPosition,
    getToggleProps,
  } = useDisclosure({ ...props, mode: "hover" });

  // Adapt the element-agnostic prop-getter back to the legacy named handlers
  // that TooltipArea and withTooltip still consume.
  const toggleProps = getToggleProps();

  return {
    isOpen,
    isFocused,
    targetRef,
    popupRef,
    popupPositionStyle,
    popupId,
    bestPosition,
    handleTriggerEnter: toggleProps.onPointerEnter ?? noop,
    handleTriggerLeave: toggleProps.onPointerLeave ?? noop,
    handleTriggerFocus: toggleProps.onFocus ?? noop,
    handleTriggerBlur: toggleProps.onBlur ?? noop,
  };
};

export default usePopup;
