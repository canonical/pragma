import type React from "react";
import { useCallback, useEffect, useId, useRef } from "react";
import { Content, Footer, Header } from "./common/index.js";
import SidePanelContext from "./common/SidePanelContext.js";
import type { SidePanelProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds side-panel";

/**
 * A panel docked to the inline-end edge of the viewport, for work that
 * accompanies the current view rather than interrupting it.
 *
 * It renders a **non-modal** `<dialog>` opened with `show()`, so the
 * application behind stays clickable and tabbable. That is the whole design
 * constraint, and everything unusual here follows from it: a non-modal dialog
 * gets no top layer (hence `position: fixed` and a z-index), no `::backdrop`,
 * no focus trap, and no native Escape handling — so this component supplies
 * the last two itself. It deliberately carries no `aria-modal`, because the
 * page is not inert and saying otherwise would misinform assistive technology.
 *
 * `open` is controlled: the panel reports dismissal through `onOpenChange` and
 * never closes itself.
 *
 * Compose the body from `SidePanel.Header`, `SidePanel.Content` and
 * `SidePanel.Footer`. Header and footer stay put; only the content scrolls.
 */
const SidePanel = ({
  open,
  onOpenChange,
  closeOnEscape = true,
  closeOnOutsideClick = false,
  className,
  children,
  "aria-label": ariaLabel,
  onKeyDown,
  onClose,
  ...props
}: SidePanelProps): React.ReactElement => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  /** Where focus was before the panel opened, so it can be handed back. */
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  const requestClose = useCallback(() => onOpenChange(false), [onOpenChange]);

  // Mirror `open` onto the dialog. `show()` — not `showModal()` — is what keeps
  // the rest of the page interactive, and it is the reason this component is a
  // non-modal dialog at all. Focus is moved into the panel but never trapped.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      previouslyFocusedRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      dialog.show();
      dialog.focus();
    } else if (!open && dialog.open) {
      dialog.close();
      // Hand focus back only if it is still inside the panel; the user may have
      // moved on to the application, and stealing focus back would be rude.
      if (dialog.contains(document.activeElement)) {
        previouslyFocusedRef.current?.focus();
      }
      previouslyFocusedRef.current = null;
    }
  }, [open]);

  // Close a still-open panel on an outside press, when asked to. Off by
  // default: with the application live behind the panel, a press there is
  // ordinary work rather than a dismissal gesture.
  useEffect(() => {
    if (!open || !closeOnOutsideClick) return;

    const onPointerDown = (event: PointerEvent): void => {
      const dialog = dialogRef.current;
      if (!dialog) return;
      if (event.target instanceof Node && !dialog.contains(event.target)) {
        requestClose();
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, closeOnOutsideClick, requestClose]);

  return (
    <dialog
      ref={dialogRef}
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      // The header's heading names the panel. Without a header the consumer
      // supplies `aria-label`, and pointing at an absent element is worse than
      // not pointing at all — so the two are mutually exclusive.
      aria-label={ariaLabel}
      aria-labelledby={ariaLabel === undefined ? titleId : undefined}
      // Focusable so that opening can place focus on the panel itself.
      tabIndex={-1}
      // A non-modal dialog gets no `cancel` event, so Escape is handled here.
      // Bound to the dialog rather than the document on purpose: Escape while
      // focus is out in the application belongs to the application.
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (
          closeOnEscape &&
          event.key === "Escape" &&
          !event.defaultPrevented
        ) {
          requestClose();
        }
      }}
      // The platform can close a dialog without going through our handlers.
      // Report that, or `open` and the DOM desync and reopening stops working.
      onClose={(event) => {
        onClose?.(event);
        if (open) requestClose();
      }}
      {...props}
    >
      <SidePanelContext.Provider value={{ requestClose, titleId }}>
        {children}
      </SidePanelContext.Provider>
    </dialog>
  );
};

SidePanel.Header = Header;
SidePanel.Content = Content;
SidePanel.Footer = Footer;

export default SidePanel;
