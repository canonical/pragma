import type {
  ComponentProps,
  MouseEvent,
  ReactElement,
  ReactNode,
  Ref,
  RefObject,
} from "react";

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
  /** Open the panel if closed, or close it if open. */
  toggle: () => void;
  /** The underlying `<dialog>`, for anything the handle does not cover. */
  element: HTMLDialogElement | null;
}

type OwnProps = {
  /**
   * Panel contents. Compose from `SidePanel.Header`, `SidePanel.Content` and
   * `SidePanel.Footer`; the header and footer stay put while the content
   * scrolls. The header is required: its title names the panel, and the
   * provider warns in development when it is missing.
   */
  children: ReactNode;
  /**
   * The panel's imperative handle, and the only way the panel opens:
   * `ref.current?.open()`, with `ref.current?.close()` closing it, and
   * `ref.current?.toggle()` switching it between those states.
   */
  ref: Ref<SidePanelHandle>;
};

/**
 * Props for the SidePanel provider.
 *
 * The panel is opened and closed through the imperative `ref` handle, not an
 * `open` prop: the dialog's native open state is the single source of truth.
 * Do not set the native `open` attribute — it is omitted from the surface
 * precisely so the panel's bookkeeping (focus handoff) cannot be bypassed.
 *
 * Props extend the native props of the `<dialog>` root, so every attribute it
 * accepts reaches the DOM. That includes the dialog's own `onClose`: pass your
 * own to hear about every close. The panel's bookkeeping runs after the handler.
 *
 * The panel is always named by its header's title, so `children` must include
 * a `SidePanel.Header` — the provider warns in development when it does not.
 */
export type SidePanelProviderProps = OwnProps &
  Omit<ComponentProps<"dialog">, keyof OwnProps | "open">;

/**
 * The one requirement {@link withSidePanel} places on the component it wraps:
 * it must accept an `onClick` handler. A trigger that accepts
 * `onClick` but never forwards it to a clickable element never toggles its
 * panel. An `onClick` the consumer passes still runs: the HOC calls it first,
 * then toggles the panel.
 *
 */
export type WithSidePanelTriggerProps = {
  onClick?(event: MouseEvent): void;
};

/**
 * What {@link withSidePanel} hands a {@link WithSidePanelRender} function: a
 * props object.
 */
export type WithSidePanelRenderProps = {
  /** Closes the panel. What a footer button wires its `onClick` to. */
  close: () => void;
  /**
   * The handle on the panel the trigger toggles. The factory MUST set it on
   * the `<SidePanel>` it returns — `<SidePanel ref={ref}>`. `SidePanel`
   * requires its `ref`, so a factory that forgets it fails to compile.
   */
  ref: RefObject<SidePanelHandle | null>;
};

/**
 * Every factory must attach the `ref` it receives to the `<SidePanel>` it
 * returns.** The trigger toggles the panel through that ref. `SidePanel`
 * requires its `ref`, so a factory that forgets it fails to compile:
 *
 * `({ ref }) => <SidePanel ref={ref}>…</SidePanel>`
 *
 * or, with a footer button that closes the panel:
 *
 * `({ close, ref }) => <SidePanel ref={ref}><SidePanel.Footer><Button onClick={close}>Done</Button></SidePanel.Footer></SidePanel>`
 */
export type WithSidePanelRender = (
  props: WithSidePanelRenderProps,
) => ReactElement<SidePanelProviderProps>;
