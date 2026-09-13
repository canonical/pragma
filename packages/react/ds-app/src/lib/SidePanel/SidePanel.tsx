import type React from "react";
import {
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
} from "react";
import SidePanelContext from "./Context.js";
import { Content, Footer, Header } from "./common/index.js";
import type { SidePanelHandle, SidePanelProps } from "./types.js";
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
 * The panel is controlled through its `ref`: `open()` shows it and moves focus
 * in, `close()` hides it and hands focus back. The dialog's native open state
 * is the single source of truth — there is no `open` prop to mirror it, and
 * every change is reported through `onOpenChange`, whether the handle, a
 * dismissal gesture, or the platform caused it.
 *
 * Compose the body from `SidePanel.Header`, `SidePanel.Content` and
 * `SidePanel.Footer`. Header and footer stay put; only the content scrolls.
 *
 * The panel needs an accessible name: the header's heading provides it, so a
 * panel without a `SidePanel.Header` must pass `aria-label` instead.
 * Development warns when an opening panel has neither.
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
  closeOnEscape = true,
  closeOnOutsideClick = false,
  className,
  children,
  ref,
  "aria-label": ariaLabel,
  onKeyDown,
  onClose,
  onOpenChange,
  ...props
}: SidePanelProps): React.ReactElement => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  /** Where focus was before the panel opened, so it can be handed back. */
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  /**
   * A live mirror of the dialog's open state. Cleanups cannot read the ref —
   * by the time an unmount cleanup runs, React has already detached it — so
   * the unmount cleanup reads this instead to answer "was the panel still open
   * when it died?".
   */
  const openRef = useRef(false);

  const openPanel = useCallback(() => {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;

    // A panel labelled by an absent heading has no accessible name at all, and
    // nothing about that is visible: warn the way Button does for the icon-only
    // case. Dev-only, and checked where opening actually happens rather than in
    // an effect — the panel no longer re-renders to say it is open.
    if (
      typeof process !== "undefined" &&
      process.env.NODE_ENV !== "production"
    ) {
      if (ariaLabel === undefined && !document.getElementById(titleId)) {
        console.warn(
          "SidePanel has no accessible name: render a <SidePanel.Header>, or pass `aria-label` when the panel has no header.",
        );
      }
    }

    previouslyFocusedRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    // `show()` — not `showModal()` — is what keeps the rest of the page
    // interactive, and it is the reason this component is a non-modal dialog
    // at all. Focus is moved into the panel but never trapped.
    dialog.show();
    openRef.current = true;
    dialog.focus();
    onOpenChange?.(true);
  }, [ariaLabel, titleId, onOpenChange]);

  const closePanel = useCallback(() => {
    dialogRef.current?.close();
  }, []);

  // The panel keeps its own dialog ref (show()/close() run through it) and
  // exposes the imperative handle — not the raw element — to a consumer ref.
  useImperativeHandle(
    ref,
    (): SidePanelHandle => ({
      open: openPanel,
      close: closePanel,
      element: dialogRef.current,
    }),
    [openPanel, closePanel],
  );

  // Close a still-open panel on an outside press, when asked to. Off by
  // default: with the application live behind the panel, a press there is
  // ordinary work rather than a dismissal gesture. The listener is gated on
  // the dialog's own open state — there is no prop to gate it on anymore.
  useEffect(() => {
    if (!closeOnOutsideClick) return;

    const onPointerDown = (event: PointerEvent): void => {
      const dialog = dialogRef.current;
      if (!dialog?.open) return;
      if (event.target instanceof Node && !dialog.contains(event.target)) {
        closePanel();
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [closeOnOutsideClick, closePanel]);

  // Hand focus back if the panel disappears while still open.
  //
  // There are two ways a panel closes:
  //
  // 1. `panelRef.current.close()` — the handle closes it, and its close
  //    handler already handed focus back. This effect then has nothing to do
  //    (openRef is already false, so it bails out below).
  //
  // 2. The panel is unmounted while open — nobody called close(), React just
  //    removed it. The typical case is navigation: the user moves to another
  //    route and the whole subtree, panel included, goes away. (A consumer
  //    conditionally rendering the panel — `{isOpen && <SidePanel …/>}` —
  //    also lands here, though the mounted-always pattern is the intended
  //    one.) Focus is sitting on an element that no longer exists, so the
  //    browser dumps it on <body>, and a keyboard user lands in the middle of
  //    nowhere. This cleanup catches that case and puts focus back where it
  //    was before the panel opened — usually the button that opened it.
  useEffect(() => {
    return () => {
      const previouslyFocused = previouslyFocusedRef.current;

      // Bail out when the panel was already closed (its close already handled
      // focus), or when we never recorded where focus came from.
      if (!openRef.current || !previouslyFocused) return;

      // Where is focus right now?
      // - On <body> (or nothing): focus died with the panel — the browser
      //   always moves focus to <body> when the focused element is removed.
      //   Rescue it and send it back.
      // - Anywhere else: the user clicked something in the application behind
      //   the panel before it went away. They chose where to be — moving
      //   focus back would override that choice.
      const active = document.activeElement;
      if (active === null || active === document.body) {
        previouslyFocused.focus();
      }
    };
  }, []);

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
          closePanel();
        }
      }}
      // Every close funnels through the platform's `close` event — the
      // handle's `close()`, a dismissal gesture, or a path the component did
      // not drive at all (a `<form method="dialog">` submits one). Tidy up the
      // open state, hand focus back, and report it, in that one place.
      onClose={(event) => {
        onClose?.(event);
        openRef.current = false;
        const dialog = dialogRef.current;
        // Hand focus back only if it is still inside the panel; the user may
        // have moved on to the application, and stealing focus back would be
        // rude.
        if (dialog?.contains(document.activeElement)) {
          previouslyFocusedRef.current?.focus();
        }
        previouslyFocusedRef.current = null;
        onOpenChange?.(false);
      }}
      {...props}
    >
      <SidePanelContext.Provider value={{ close: closePanel, titleId }}>
        {children}
      </SidePanelContext.Provider>
    </dialog>
  );
};

SidePanel.Header = Header;
SidePanel.Content = Content;
SidePanel.Footer = Footer;

export default SidePanel;
