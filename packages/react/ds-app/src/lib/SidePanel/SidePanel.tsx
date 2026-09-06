import type React from "react";
import { useCallback, useEffect, useId, useRef } from "react";
import SidePanelContext from "./Context.js";
import { Content, Footer, Header } from "./common/index.js";
import mergeRefs from "./common/mergeRefs.js";
import type { SidePanelProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds side-panel";

/**
 * A panel docked to the inline-end edge of the viewport, for work that
 * accompanies the current view rather than interrupting it.
 *
 * It renders a **non-modal** `<dialog>` opened with `show()`, so the
 * application behind stays clickable and tabbable. That is the whole design
 * constraint, and everything else follows from it: a non-modal dialog
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
 *
 * The panel needs an accessible name: the header's heading provides it, so a
 * panel without a `SidePanel.Header` must pass `aria-label` instead.
 * Development warns when an open panel has neither.
 *
 * Because the panel is its own scroll container and is offset with a
 * transform, it both clips and re-anchors its descendants: an overlay that
 * needs to escape the panel's box — a `Popover` or `ContextualMenu`, whose
 * content is `position: fixed` — is cut off at the panel edge and positioned
 * against the panel rather than the viewport. Keep such overlays inside the
 * panel's bounds, or render them outside it.
 *
 * `import { SidePanel } from "@canonical/react-ds-app";`
 *
 * @implements ds:apps.pattern.side_panel
 */
const SidePanel = ({
  open,
  onOpenChange,
  closeOnEscape = true,
  closeOnOutsideClick = false,
  className,
  children,
  ref,
  "aria-label": ariaLabel,
  onKeyDown,
  onClose,
  ...props
}: SidePanelProps): React.ReactElement => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  /** Where focus was before the panel opened, so it can be handed back. */
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  /**
   * A live mirror of the latest `open`. Cleanups cannot read props — they only
   * see what was captured when they were created — so the unmount cleanup reads
   * this instead to answer "was the panel still open when it died?". That only
   * matters for the conditional-render close (`{isOpen && <SidePanel …/>}`),
   * where the panel unmounts without `open` ever flipping and the open/close
   * effect never runs.
   */
  const openRef = useRef(false);

  const requestClose = useCallback(() => onOpenChange(false), [onOpenChange]);

  // Mirror `open` onto the dialog. `show()` — not `showModal()` — is what keeps
  // the rest of the page interactive, and it is the reason this component is a
  // non-modal dialog at all. Focus is moved into the panel but never trapped.
  useEffect(() => {
    // Keep the mirror current — the unmount cleanup reads it after we're gone.
    openRef.current = open;
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

  // Hand focus back when the panel is removed from the tree while still open.
  // The effect above never runs for an unmount — a consumer who conditionally
  // renders the panel (`{isOpen && <SidePanel …/>}`) closes it that way rather
  // than by flipping `open`, and focus would otherwise fall to the document.
  //
  // Reads `openRef` rather than the dialog: by the time an unmount cleanup
  // runs, React has already detached the ref and the node.
  useEffect(() => {
    return () => {
      const previouslyFocused = previouslyFocusedRef.current;
      if (!openRef.current || !previouslyFocused) return;
      // Focus has nowhere to be: the browser drops it to the body when the
      // focused node is removed. Anything else means the user moved on to the
      // application, and taking focus back would be rude.
      const active = document.activeElement;
      if (active === null || active === document.body) {
        previouslyFocused.focus();
      }
    };
  }, []);

  // A panel labelled by an absent heading has no accessible name at all, and
  // nothing about that is visible: warn the way Button does for the icon-only
  // case. Dev-only and effect-bound, so it costs nothing in production and
  // never runs on the server.
  useEffect(() => {
    if (typeof process === "undefined") return;
    if (process.env.NODE_ENV === "production") return;
    if (!open || ariaLabel !== undefined) return;
    if (document.getElementById(titleId)) return;
    console.warn(
      "SidePanel has no accessible name: render a <SidePanel.Header>, or pass `aria-label` when the panel has no header.",
    );
  }, [open, ariaLabel, titleId]);

  return (
    <dialog
      // The panel keeps its own ref (show()/close() and the focus hand-back
      // run through it) and fans the element out to a consumer ref alongside.
      ref={mergeRefs(dialogRef, ref)}
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
