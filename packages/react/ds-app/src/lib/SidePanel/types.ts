import type { ComponentProps, ReactNode, Ref } from "react";

/** The small API a SidePanel threads down to its header, content and footer. */
export interface SidePanelContextValue {
  /** Close the panel. */
  close: () => void;
  /** Id the panel is labelled by. `Header` puts it on its heading. */
  titleId: string;
}

/**
 * The imperative handle a SidePanel exposes through its `ref`.
 *
 * The panel is controlled through this handle rather than an `open` prop: the
 * `<dialog>` element's own open state is the only source of truth, and the
 * handle drives it directly — nothing to mirror, nothing to desync.
 */
export interface SidePanelHandle {
  /** Open the panel and move focus into it. A no-op while already open. */
  open: () => void;
  /**
   * Close the panel and hand focus back to where it was before the panel
   * opened. A no-op while already closed.
   */
  close: () => void;
  /** The underlying `<dialog>`, for anything the handle does not cover. */
  element: HTMLDialogElement | null;
}

type OwnProps = {
  /**
   * Called whenever the panel's open state changes, in either direction and
   * from any cause — the handle, the header's close button, Escape, an outside
   * press when `closeOnOutsideClick` is enabled, or the platform itself.
   * Informational: the panel reports what happened, it does not ask permission.
   * Consumers who mirror the state (a toggle button's pressed state, say)
   * follow this; the panel never reads it back.
   */
  onOpenChange?: (open: boolean) => void;
  /**
   * Close when Escape is pressed while focus is inside the panel. Defaults to
   * true. Focus outside the panel belongs to the application, so Escape there
   * is deliberately not intercepted.
   */
  closeOnEscape?: boolean;
  /**
   * Close when a pointer press lands outside the panel. Defaults to **false**,
   * unlike a modal dialog: the application behind stays interactive, so a press
   * in it is ordinary work rather than a dismissal gesture.
   */
  closeOnOutsideClick?: boolean;
  /**
   * Panel contents. Compose from `SidePanel.Header`, `SidePanel.Content` and
   * `SidePanel.Footer`; the header and footer stay put while the content
   * scrolls.
   */
  children: ReactNode;
  /**
   * Receives the panel's imperative handle — `open()`, `close()` and the
   * underlying dialog element. The panel starts closed; open it through the
   * handle.
   */
  ref?: Ref<SidePanelHandle>;
};

/**
 * Props for SidePanel.
 *
 * The panel is opened and closed through the imperative `ref` handle, not an
 * `open` prop: the dialog's native open state is the single source of truth,
 * and every change is reported through `onOpenChange`. Do not set the native
 * `open` attribute — it is omitted from the surface precisely so the panel's
 * bookkeeping (focus, reporting) cannot be bypassed.
 *
 * Props extend the native props of the `<dialog>` root, so every attribute it
 * accepts (data-*, aria-*, event handlers, …) reaches the DOM.
 */
export type SidePanelProps = OwnProps &
  Omit<ComponentProps<"dialog">, keyof OwnProps | "open">;
