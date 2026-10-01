import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  OVERLAY_PLACEMENT,
  useDisclosure,
  useIsMounted,
} from "../../hooks/index.js";
import { Button } from "../Button/index.js";
import type { PopoverProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds popover";
const focusableSelector =
  'a[href], button, input:not([type="hidden"]), select, textarea, [contenteditable="true"], [tabindex]:not([tabindex="-1"])';

const setRef = <T,>(ref: React.Ref<T> | undefined, value: T | null) => {
  if (typeof ref === "function") ref(value);
  else if (ref) ref.current = value;
};

const isUsableFocusTarget = (candidate: HTMLElement, dialog: HTMLElement) => {
  if (candidate.matches(':disabled, [aria-disabled="true"]')) return false;
  for (
    let node: HTMLElement | null = candidate;
    node;
    node = node.parentElement
  ) {
    if (node.matches('[hidden], [inert], [aria-hidden="true"]')) return false;
    const style = getComputedStyle(node);
    if (style.display === "none" || style.visibility === "hidden") return false;
    if (node === dialog) return true;
  }
  return false;
};

const firstFocusable = (dialog: HTMLElement): HTMLElement | null =>
  Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector)).find(
    (candidate) => isUsableFocusTarget(candidate, dialog),
  ) ?? null;

/**
 * An anchored, non-modal dialog for interactive content. The native
 * details/summary variant keeps its no-JavaScript disclosure baseline; a
 * styled Button or external anchor uses the same dialog behavior after mount.
 *
 * @implements ds:global.component.popover
 */
const Popover = ({
  trigger,
  triggerProps,
  anchorRef,
  children,
  label,
  initialFocusRef,
  dialogProps,
  className,
  open,
  onOpenChange,
  preferredDirections,
  distance,
  gutter,
  maxWidth,
  autoFit,
  closeOnEscape = true,
  closeOnOutsideClick,
  ...rootProps
}: PopoverProps): React.ReactElement => {
  const mounted = useIsMounted();
  const isAnchored = !!anchorRef;
  const isButton = !!triggerProps;
  const focusPendingRef = useRef(false);
  // A ref's identity does not change when its menu item attaches. Rerender
  // once so the fitment hook observes that newly attached external anchor.
  const [, setAnchorVersion] = useState(0);
  const {
    isOpen,
    close,
    targetRef,
    popupRef,
    popupPositionStyle,
    popupId,
    bestPosition,
    getToggleProps,
  } = useDisclosure<HTMLElement>({
    mode: "click",
    isOpen: open,
    preferredDirections: preferredDirections ?? OVERLAY_PLACEMENT,
    distance,
    gutter,
    maxWidth,
    autoFit: autoFit ?? true,
    // Escape belongs to the dialog, so it cannot also close an owning menu.
    closeOnEscape: false,
    closeOnOutsideClick,
    // Outside pointer dismissal must not steal focus from its clicked target.
    returnFocus: false,
    onShow: () => onOpenChange?.(true),
    onHide: () => onOpenChange?.(false),
  });

  useEffect(() => {
    if (!anchorRef) return;
    targetRef.current = anchorRef.current;
    if (isOpen) setAnchorVersion((value) => value + 1);
  }, [anchorRef, isOpen, targetRef]);

  const dialogId = dialogProps?.id ?? popupId;
  const triggerId = `${popupId}-trigger`;
  const toggleProps = getToggleProps();

  const focusAnchor = useCallback(() => {
    if (anchorRef) {
      if (anchorRef.current?.isConnected) anchorRef.current.focus();
      return;
    }
    const target = targetRef.current;
    const launcher =
      target?.tagName === "DETAILS"
        ? target.querySelector<HTMLElement>("summary")
        : target;
    if (launcher?.isConnected) launcher.focus();
  }, [anchorRef, targetRef]);

  const dismissOnEscape = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key !== "Escape" || !isOpen || !closeOnEscape) return;
      event.preventDefault();
      event.stopPropagation();
      close();
      focusAnchor();
    },
    [close, closeOnEscape, focusAnchor, isOpen],
  );

  // A standalone disclosure may still have focus on its launcher when an
  // application dispatches Escape at document level. An externally anchored
  // dialog leaves Escape to its own surface so an owning menu cannot race it.
  useEffect(() => {
    if (!isOpen || !closeOnEscape || isAnchored) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      close();
      focusAnchor();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [close, closeOnEscape, focusAnchor, isAnchored, isOpen]);

  // React events in a portal still bubble through their React parent. Do not
  // send an input's arrow keys or Tab to an owning menu's roving key handler.
  const handleDialogKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    dialogProps?.onKeyDown?.(event);
    event.stopPropagation();
    if (!event.defaultPrevented) dismissOnEscape(event);
  };

  useEffect(() => {
    focusPendingRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    // The surface is visibility:hidden until fitment resolves. Browser focus
    // on a hidden control is ignored, so wait for its positioned render.
    if (!isOpen || !mounted || !bestPosition || !focusPendingRef.current)
      return;
    const frame = requestAnimationFrame(() => {
      if (!focusPendingRef.current) return;
      const dialog = popupRef.current;
      if (!dialog) return;
      focusPendingRef.current = false;
      if (dialog.contains(document.activeElement)) return;
      const requested = initialFocusRef?.current;
      const target =
        requested &&
        dialog.contains(requested) &&
        isUsableFocusTarget(requested, dialog)
          ? requested
          : firstFocusable(dialog);
      (target ?? dialog).focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [bestPosition, initialFocusRef, isOpen, mounted, popupRef]);

  const dialog = (
    <div
      {...dialogProps}
      id={dialogId}
      className={[
        "ds",
        "popover__content",
        "contrasted",
        isAnchored && className,
        dialogProps?.className,
      ]
        .filter(Boolean)
        .join(" ")}
      role="dialog"
      aria-label={label || undefined}
      aria-labelledby={label ? undefined : triggerId}
      aria-hidden={mounted || isButton ? !isOpen : undefined}
      inert={mounted || isButton ? !isOpen : undefined}
      tabIndex={-1}
      data-positioned={bestPosition ? "true" : undefined}
      style={{ ...dialogProps?.style, ...popupPositionStyle }}
      ref={popupRef}
      onKeyDown={handleDialogKeyDown}
    >
      {children}
    </div>
  );

  if (isAnchored) {
    // No wrapper is inserted into an ARIA menu. The owner renders its launcher
    // as a menuitem and supplies aria-haspopup/controls/expanded.
    return <>{mounted ? createPortal(dialog, document.body) : null}</>;
  }

  const { ref: rootRef, ...restRootProps } =
    rootProps as React.ComponentProps<"div">;

  if (isButton) {
    const {
      ref: buttonRef,
      className: buttonClassName,
      onClick,
      onKeyDown,
      ...buttonProps
    } = triggerProps;
    return (
      <div
        {...restRootProps}
        className={[componentCssClassName, className].filter(Boolean).join(" ")}
        ref={rootRef}
      >
        <Button
          {...buttonProps}
          type={buttonProps.type ?? "button"}
          id={triggerId}
          className={["trigger", buttonClassName].filter(Boolean).join(" ")}
          ref={(node) => {
            targetRef.current = node;
            setRef(buttonRef, node);
          }}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-controls={dialogId}
          onClick={(event) => {
            onClick?.(event);
            if (!event.defaultPrevented) toggleProps.onClick?.(event);
          }}
          onKeyDown={(event) => {
            onKeyDown?.(event);
            if (!event.defaultPrevented) {
              dismissOnEscape(event);
              // Native Button click already handles Enter and Space.
              if (event.key === "ArrowDown") toggleProps.onKeyDown?.(event);
            }
          }}
        >
          {trigger}
        </Button>
        {mounted ? createPortal(dialog, document.body) : dialog}
      </div>
    );
  }

  return (
    <details
      {...(restRootProps as React.ComponentProps<"details">)}
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      open={isOpen}
      data-enhanced={mounted ? "true" : undefined}
      ref={(node) => {
        targetRef.current = node;
        setRef(rootRef as React.Ref<HTMLDetailsElement> | undefined, node);
      }}
    >
      {/* biome-ignore lint/a11y/noStaticElementInteractions: summary is natively interactive. */}
      <summary
        id={triggerId}
        className="trigger"
        aria-haspopup="dialog"
        aria-controls={dialogId}
        onClick={(event) => {
          event.preventDefault();
          toggleProps.onClick?.(event);
        }}
        onKeyDown={(event) => {
          dismissOnEscape(event);
          toggleProps.onKeyDown?.(event);
        }}
      >
        {trigger}
      </summary>
      {dialog}
    </details>
  );
};

export default Popover;
