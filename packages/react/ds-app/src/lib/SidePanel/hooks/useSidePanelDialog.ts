import type React from "react";
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type { SidePanelHandle } from "../types.js";
import type {
  UseSidePanelDialogProps,
  UseSidePanelDialogResult,
} from "./types.js";

/**
 * The dialog behaviour of the SidePanel provider: open/close bookkeeping,
 * focus handoff, Escape, and the imperative handle. It holds no open state —
 * the source of truth is the dialog's native state on an uncontrolled panel
 * and the `open` prop on a controlled one — and returns only the plumbing
 * the provider needs: the element ref, the `close` action, the consumer's
 * class name, the remaining native attributes, and the event wiring.
 */
const useSidePanelDialog = ({
  onKeyDown,
  onClose,
  onOpenChange,
  open,
  ref,
  className,
  ...dialogProps
}: UseSidePanelDialogProps): UseSidePanelDialogResult => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  /** Where focus was before the panel opened, so it can be handed back. */
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  /**
   * A live mirror of the dialog's open state. Cleanups cannot read the ref —
   * by the time an unmount cleanup runs, React has already detached it — so
   * the unmount cleanup reads this instead to answer "was the panel still open
   * when it died?".
   */
  const openRef = useRef(false);
  /**
   * The `open` attribute of the first render, frozen for the panel's whole
   * life. It paints a controlled panel open in server-rendered markup (and in
   * a controlled panel that mounts open); after mount it never changes — the
   * dialog's state is written only through `show()`/`close()`, so React
   * re-renders cannot fight the imperative state.
   */
  const [initiallyOpen] = useState(() => open === true);

  const close = useCallback(() => {
    // A controlled panel closes through its prop: ask the owner, and the
    // panel only actually closes when `open` flips.
    if (open !== undefined) {
      onOpenChange?.(false);
      return;
    }
    dialogRef.current?.close();
  }, [open, onOpenChange]);

  const openPanel = useCallback(() => {
    // A controlled panel opens through its prop the same way it closes.
    if (open !== undefined) {
      onOpenChange?.(true);
      return;
    }

    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;

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
  }, [open, onOpenChange]);

  const toggle = useCallback(() => {
    if (open !== undefined) {
      onOpenChange?.(!open);
      return;
    }
    if (dialogRef.current?.open) close();
    else openPanel();
  }, [open, onOpenChange, close, openPanel]);

  // The provider keeps its own dialog ref (show()/close() run through it)
  // and exposes the imperative handle — not the raw element — to a consumer
  // ref.
  useImperativeHandle(
    ref,
    (): SidePanelHandle => ({
      open: openPanel,
      close,
      toggle,
      element: dialogRef.current,
    }),
    [openPanel, close, toggle],
  );

  // Controlled panels: the prop writes the dialog's state. The effect is the
  // only post-mount writer — the `open` attribute is frozen at first render.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || open === undefined) return;

    // Already in the requested state. That includes the open attribute of
    // the first render — server-rendered markup or a controlled panel that
    // mounted open: keep the mirror fresh, but do not re-run `show()`'s
    // bookkeeping, so hydrating an open panel never steals focus.
    if (dialog.open === open) {
      openRef.current = open;
      return;
    }

    if (open) {
      previouslyFocusedRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      dialog.show();
      openRef.current = true;
      dialog.focus();
    } else {
      dialog.close();
    }
  }, [open]);

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

  /**
   * A non-modal dialog gets no `cancel` event, so Escape is handled here.
   * Bound to the dialog rather than the document on purpose: Escape while
   * focus is out in the application belongs to the application.
   */
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDialogElement>) => {
      onKeyDown?.(event);
      if (event.key === "Escape" && !event.defaultPrevented) {
        close();
      }
    },
    [onKeyDown, close],
  );

  /**
   * Every close funnels through the platform's `close` event — the handle's
   * `close()`, a dismissal gesture, or a path the component did not drive at
   * all (a `<form method="dialog">` submits one). Tidy up the open state and
   * hand focus back in that one place.
   */
  const handleClose = useCallback(
    (event: React.SyntheticEvent<HTMLDialogElement>) => {
      onClose?.(event);
      // A consumer may synchronously reopen from onClose: openPanel has then already re-recorded the
      // open state and focus origin, so leave its bookkeeping untouched.
      if (dialogRef.current?.open) return;
      // A controlled panel is closed only by its prop: a close the prop did
      // not cause (a `<form method="dialog">` submit inside the content)
      // snaps straight back to the prop's truth.
      if (open) {
        dialogRef.current?.show();
        return;
      }
      openRef.current = false;
      const dialog = dialogRef.current;
      // Hand focus back only if it is still inside the panel; the user may
      // have moved on to the application, and stealing focus back would be
      // rude.
      if (dialog?.contains(document.activeElement)) {
        previouslyFocusedRef.current?.focus();
      }
      previouslyFocusedRef.current = null;
    },
    [onClose, open],
  );

  return {
    className,
    close,
    dialogProps,
    dialogRef,
    initiallyOpen,
    handleKeyDown,
    handleClose,
  };
};

export default useSidePanelDialog;
