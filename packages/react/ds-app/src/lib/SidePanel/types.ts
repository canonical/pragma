import type { ComponentProps, ReactNode, Ref } from "react";

/** The small API a SidePanel threads down to its header, content and footer. */
export interface SidePanelContextValue {
  /** Close the panel. */
  close: () => void;
  /** Id the panel is labelled by. `Header` puts it on its title. */
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
   * from any cause — the handle, the header's close button, Escape, or the
   * platform itself. Informational: the panel reports what happened, it does
   * not ask permission. Consumers who mirror the state (a toggle button's
   * pressed state, say) follow this; the panel never reads it back.
   */
  onOpenChange?: (open: boolean) => void;
  /**
   * Stop Escape from closing the panel. Defaults to false, so Escape closes
   * the panel while focus is inside it. Focus outside the panel belongs to the
   * application, so Escape there is deliberately not intercepted.
   */
  disableEscapeClose?: boolean;
  /**
   * Panel contents. Compose from `SidePanel.Header`, `SidePanel.Content` and
   * `SidePanel.Footer`; the header and footer stay put while the content
   * scrolls. The header is required: its title names the panel, and the
   * provider warns in development when it is missing.
   */
  children: ReactNode;
  /**
   * The panel's imperative handle, and the only way the panel opens:
   * `ref.current?.open()`, with `ref.current?.close()` closing it. The prop is
   * required because the panel is only ever opened through the handle, so a
   * panel with no ref is a panel that can never open — every panel needs a
   * ref: withSidePanel hands its factory the ref to attach, and a
   * directly-composed panel driven by a trigger takes a stored ref. Requiring
   * the prop turns the withSidePanel factory's duty — attaching the ref it
   * receives — into a compile error instead of a silent nothing.
   */
  ref: Ref<SidePanelHandle>;
};

/**
 * Props for the SidePanel provider.
 *
 * The panel is opened and closed through the imperative `ref` handle, not an
 * `open` prop: the dialog's native open state is the single source of truth,
 * and every change is reported through `onOpenChange`. Do not set the native
 * `open` attribute — it is omitted from the surface precisely so the panel's
 * bookkeeping (focus, reporting) cannot be bypassed.
 *
 * Props extend the native props of the `<dialog>` root, so every attribute it
 * accepts (data-*, aria-*, event handlers, …) reaches the DOM.
 *
 * The panel is always named by its header's title, so `children` must include
 * a `SidePanel.Header` — the provider warns in development when it does not.
 */
export type SidePanelProviderProps = OwnProps &
  Omit<ComponentProps<"dialog">, keyof OwnProps | "open">;
