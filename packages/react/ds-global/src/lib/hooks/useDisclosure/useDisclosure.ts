import {
  type FocusEventHandler,
  type KeyboardEventHandler,
  type MouseEvent,
  type PointerEventHandler,
  useCallback,
  useEffect,
  useId,
  useState,
} from "react";
import { useDelayedToggle } from "../useDelayedToggle/index.js";
import { useWindowFitment } from "../useWindowFitment/index.js";
import type {
  DisableableElement,
  DisclosureContentProps,
  DisclosureToggleProps,
  UseDisclosureProps,
  UseDisclosureResult,
} from "./types.js";

/**
 * Manages the open state, positioning, and accessibility wiring of a disclosure
 * (a popup revealed by a trigger). The hook is headless and element-agnostic:
 * it renders nothing and returns prop-getters the consumer spreads onto whichever
 * trigger and content elements it chooses to render.
 *
 * In `hover` mode the popup opens on pointer-enter / focus and closes on
 * pointer-leave / blur, with a delay — suited to tooltips. In `click` mode it
 * toggles on click, closes on outside-click and Escape, and returns focus to the
 * trigger on close — suited to popovers, menus, and dropdowns, layered over a
 * native `<details>` or `<button aria-expanded>` baseline.
 *
 * @param mode How the disclosure opens and closes. Defaults to `hover`.
 * @param isOpen An override for the open state; when boolean, the hook is controlled.
 * @param deactivateDelay Delay in milliseconds before closing (`hover` mode).
 * @param activateDelay Delay in milliseconds before opening (`hover` mode).
 * @param onEnter Called when the pointer enters the trigger (`hover` mode).
 * @param onLeave Called when the pointer leaves the trigger (`hover` mode).
 * @param onFocus Called when the trigger is focused.
 * @param onBlur Called when the trigger loses focus.
 * @param onShow Called when the popup is shown.
 * @param onHide Called when the popup is hidden.
 * @param closeOnEscape Whether Escape closes the popup. Defaults to true.
 * @param closeOnOutsideClick Whether an outside pointer-down closes a `click` popup. Defaults to true.
 * @param returnFocus Whether closing a `click` popup returns focus to the trigger. Defaults to true.
 * @param props Forwarded to the useWindowFitment hook.
 * @returns The open state, imperative controls, positioning refs and style, and prop-getters.
 */
const useDisclosure = <TTarget extends HTMLElement = HTMLElement>({
  mode = "hover",
  isOpen: isOpenProp,
  deactivateDelay,
  activateDelay,
  onEnter,
  onLeave,
  onFocus,
  onBlur,
  onShow,
  onHide,
  closeOnEscape = true,
  closeOnOutsideClick = true,
  returnFocus = true,
  ...props
}: UseDisclosureProps): UseDisclosureResult<TTarget> => {
  const isServer = typeof window === "undefined";
  const isClick = mode === "click";
  const [isFocused, setIsFocused] = useState(false);
  // Click disclosures open/close synchronously; hover disclosures use the timer.
  const [isOpenClick, setIsOpenClick] = useState(false);
  const popupId = useId();

  const {
    flag: isOpenHover,
    deactivate: scheduleClose,
    activate: scheduleOpen,
  } = useDelayedToggle({
    activateDelay,
    deactivateDelay,
    onActivate: onShow,
    onDeactivate: onHide,
  });

  const isOpenInternal = isClick ? isOpenClick : isOpenHover;
  // A boolean override makes the hook controlled; otherwise the internal state wins.
  const isOpen = typeof isOpenProp === "boolean" ? isOpenProp : isOpenInternal;

  const {
    targetRef,
    popupRef,
    bestPosition,
    popupPositionStyle,
    arrowOffset,
    direction,
  } = useWindowFitment<TTarget>({
    ...props,
    isOpen,
  });

  const open = useCallback(() => {
    if (isServer) return;
    if (isClick) {
      setIsOpenClick(true);
      onShow?.();
    } else {
      scheduleOpen(new Event("open"));
    }
  }, [scheduleOpen, isServer, isClick, onShow]);

  const close = useCallback(() => {
    if (isServer) return;
    if (isClick) {
      setIsOpenClick(false);
      onHide?.();
      // Return focus to the trigger whenever a click disclosure closes —
      // outside-click, Escape, toggle, or an explicit close() all route here.
      // @note Impure — moves DOM focus.
      if (returnFocus) targetRef.current?.focus();
    } else {
      scheduleClose(new Event("close"));
    }
  }, [scheduleClose, isServer, isClick, onHide, returnFocus, targetRef]);

  const toggle = useCallback(() => {
    if (isOpen) close();
    else open();
  }, [isOpen, open, close]);

  const isDisabled = useCallback((el: DisableableElement) => el?.disabled, []);

  const handleTriggerEnter: PointerEventHandler = useCallback(
    (event) => {
      if (isServer || isDisabled(event.target as DisableableElement)) return;
      open();
      onEnter?.(event);
    },
    [open, onEnter, isServer, isDisabled],
  );

  const handleTriggerLeave: PointerEventHandler = useCallback(
    (event) => {
      if (isServer || isDisabled(event.target as DisableableElement)) return;
      close();
      onLeave?.(event);
    },
    [close, onLeave, isServer, isDisabled],
  );

  const handleTriggerFocus: FocusEventHandler = useCallback(
    (event) => {
      if (isServer) return;
      setIsFocused(true);
      // Focus reveals a hover disclosure (keyboard parity); a click disclosure
      // opens only on an explicit click, so focus alone must not open it.
      if (!isClick) open();
      onFocus?.(event);
    },
    [open, onFocus, isServer, isClick],
  );

  const handleTriggerBlur: FocusEventHandler = useCallback(
    (event) => {
      if (isServer) return;
      setIsFocused(false);
      if (!isClick) close();
      onBlur?.(event);
    },
    [close, onBlur, isServer, isClick],
  );

  const handleTriggerClick = useCallback(
    (event: MouseEvent) => {
      if (isServer || isDisabled(event.target as DisableableElement)) return;
      toggle();
    },
    [toggle, isServer, isDisabled],
  );

  const handleTriggerKeyDown: KeyboardEventHandler = useCallback(
    (event) => {
      if (isServer || !isClick) return;
      // Space and Enter activate the trigger; ArrowDown opens the popup so
      // keyboard users can move into it without toggling it shut.
      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        toggle();
      } else if (event.key === "ArrowDown" && !isOpen) {
        event.preventDefault();
        open();
      }
    },
    [isClick, isOpen, toggle, open, isServer],
  );

  // Close on Escape. `close()` handles return-focus for click disclosures.
  useEffect(() => {
    if (isServer || !closeOnEscape || !isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [close, closeOnEscape, isOpen, isServer]);

  // Close a click disclosure when a pointer-down lands outside trigger and content.
  useEffect(() => {
    if (isServer || !isClick || !closeOnOutsideClick || !isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const node = event.target as Node | null;
      if (!node) return;
      if (
        targetRef.current?.contains(node) ||
        popupRef.current?.contains(node)
      ) {
        return;
      }
      close();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [
    isServer,
    isClick,
    closeOnOutsideClick,
    isOpen,
    close,
    targetRef,
    popupRef,
  ]);

  const getToggleProps = useCallback((): DisclosureToggleProps => {
    if (isClick) {
      return {
        "aria-expanded": isOpen,
        "aria-controls": popupId,
        onClick: handleTriggerClick,
        onKeyDown: handleTriggerKeyDown,
        onFocus: handleTriggerFocus,
        onBlur: handleTriggerBlur,
      };
    }
    return {
      "aria-describedby": popupId,
      onPointerEnter: handleTriggerEnter,
      onPointerLeave: handleTriggerLeave,
      onFocus: handleTriggerFocus,
      onBlur: handleTriggerBlur,
    };
  }, [
    isClick,
    isOpen,
    popupId,
    handleTriggerClick,
    handleTriggerKeyDown,
    handleTriggerEnter,
    handleTriggerLeave,
    handleTriggerFocus,
    handleTriggerBlur,
  ]);

  const getContentProps = useCallback((): DisclosureContentProps => {
    const contentProps: DisclosureContentProps = {
      id: popupId,
      hidden: !isOpen,
    };
    // Hover popups keep the pointer handlers so moving onto the popup keeps it open.
    if (!isClick) {
      contentProps.onPointerEnter = handleTriggerEnter;
      contentProps.onPointerLeave = handleTriggerLeave;
    }
    return contentProps;
  }, [popupId, isOpen, isClick, handleTriggerEnter, handleTriggerLeave]);

  return {
    isOpen,
    isFocused,
    open,
    close,
    toggle,
    targetRef,
    popupRef,
    popupPositionStyle,
    popupId,
    bestPosition,
    arrowOffset,
    direction,
    getToggleProps,
    getContentProps,
  };
};

export default useDisclosure;
