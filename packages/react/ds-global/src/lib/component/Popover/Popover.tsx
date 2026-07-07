import type React from "react";
import { useCallback } from "react";
import {
  getReadingDirectionPlacement,
  readDocumentDirection,
  useDisclosure,
} from "#lib/hooks/index.js";
import type { PopoverProps } from "./types.js";
import "./styles.css";

// The popover content sits on the `contrasted` surface so it stands out from
// the page behind it (dark chip on a light UI, light on a dark UI).
const componentCssClassName = "ds popover";
const contentSurfaceClassName = "contrasted";

/**
 * A popover reveals supplementary content anchored to a trigger. It renders as a
 * native `<details>`/`<summary>` so the toggle works without JavaScript; once
 * hydrated, positioning, outside-click and Escape dismissal are layered on via
 * the disclosure hook.
 *
 * `import { Popover } from "@canonical/react-ds-global";`
 *
 * @implements dso:global.component.popover
 */
const Popover = ({
  trigger,
  children,
  className,
  open,
  onOpenChange,
  preferredDirections,
  distance,
  gutter,
  maxWidth,
  autoFit,
  closeOnEscape,
  closeOnOutsideClick,
  ...props
}: PopoverProps): React.ReactElement => {
  const {
    isOpen,
    targetRef,
    popupRef,
    popupPositionStyle,
    popupId,
    bestPosition,
    getToggleProps,
    getContentProps,
  } = useDisclosure({
    mode: "click",
    isOpen: open,
    // Auto-fit by default, opening toward the reading direction first.
    preferredDirections:
      preferredDirections ??
      getReadingDirectionPlacement(readDocumentDirection()),
    distance,
    gutter,
    maxWidth,
    autoFit: autoFit ?? true,
    closeOnEscape,
    closeOnOutsideClick,
    onShow: () => onOpenChange?.(true),
    onHide: () => onOpenChange?.(false),
  });

  const toggleProps = getToggleProps();
  const contentProps = getContentProps();

  // Once hydrated, the disclosure hook owns the toggle: intercept the summary
  // click so the native <details> toggle does not fight the hook, and drive the
  // open state from the hook instead. Without JS, the native toggle is the
  // baseline and this handler never runs.
  const handleSummaryClick = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      toggleProps.onClick?.(event);
    },
    [toggleProps],
  );

  return (
    <details
      className={[componentCssClassName, bestPosition?.positionName, className]
        .filter(Boolean)
        .join(" ")}
      open={isOpen}
      ref={targetRef as React.Ref<HTMLDetailsElement>}
      {...props}
    >
      {/* biome-ignore lint/a11y/noStaticElementInteractions: <summary> is natively interactive (it toggles its <details>); the click handler augments that behaviour */}
      <summary
        className="trigger"
        // The native <details open> conveys the expanded state; aria-expanded on
        // a <summary> is invalid, so only aria-controls is set here.
        aria-controls={toggleProps["aria-controls"]}
        onClick={handleSummaryClick}
        onKeyDown={toggleProps.onKeyDown}
      >
        {trigger}
      </summary>
      <div
        className={["content", contentSurfaceClassName].join(" ")}
        id={popupId}
        ref={popupRef}
        role="dialog"
        // `aria-hidden` reflects the semantic open state (drives the a11y tree).
        aria-hidden={!isOpen}
        // Visual reveal is gated separately on a resolved position: `isOpen`
        // flips true on click before `bestPosition` is computed, so without this
        // the content would flash at the fallback top:0/left:0 for a frame before
        // snapping into place. The CSS only makes it visible when it is both open
        // AND positioned, so the open animation runs from the correct spot.
        data-positioned={bestPosition ? "true" : undefined}
        style={popupPositionStyle}
        onPointerEnter={contentProps.onPointerEnter}
      >
        {children}
      </div>
    </details>
  );
};

export default Popover;
