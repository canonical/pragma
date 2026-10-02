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
 * On an uncontrolled panel — no `open` prop — the handle is how the panel
 * opens and closes: the `<dialog>` element's own open state is the only
 * source of truth, and the handle drives it directly. On a controlled panel
 * — an `open` prop is passed — the prop is the source of truth instead, and
 * the handle routes through `onOpenChange`: `open()` asks to open,
 * `close()` asks to close, and the panel only actually changes when the
 * prop does.
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
   * The panel's imperative handle. On an uncontrolled panel it is the only
   * way the panel opens: `ref.current?.open()`, with `ref.current?.close()`
   * closing it, and `ref.current?.toggle()` switching it between those
   * states. On a controlled panel — an `open` prop is passed — the handle is
   * optional and routes through `onOpenChange` instead of driving the dialog
   * directly.
   */
  ref?: Ref<SidePanelHandle>;
  /**
   * Open the panel from outside: pass it and the panel becomes controlled —
   * it renders exactly what the prop says and never opens or closes on its
   * own. Every dismissal gesture (the header's close button, Escape) fires
   * `onOpenChange(false)` and waits for the prop to change.
   *
   * This is the prop that makes the panel server-renderable: a server can
   * never call the handle's `show()`, but it can render `open={true}`, so a
   * URL that should arrive with the panel open does. Hold the state in the
   * URL — a search parameter read with the router's hooks — and pass it
   * here, so the server and the client render the same truth.
   */
  open?: boolean;
  /**
   * A dismissal gesture happened — the header's close button or Escape — and
   * the panel is asking to close. Fired only while the panel is controlled;
   * the panel itself stays open until `open` changes. Wire it to whatever
   * owns the state — with URL-held state, navigate the search parameter
   * away. Fired before the dialog changes, so the consumer can decline.
   */
  onOpenChange?: (open: boolean) => void;
};

/**
 * Props for the SidePanel provider.
 *
 * Uncontrolled by default: the panel opens and closes through the imperative
 * `ref` handle, and the dialog's native open state is the single source of
 * truth. Pass an `open` prop to make it controlled instead — the panel then
 * renders exactly what the prop says, and dismissal gestures fire
 * `onOpenChange` for the owner to act on (see those props). The native
 * `open` attribute is not part of the surface in either mode: uncontrolled
 * so the panel's bookkeeping (focus handoff) cannot be bypassed, controlled
 * so the prop's sync effect stays the only writer.
 *
 * Props extend the native props of the `<dialog>` root, so every attribute it
 * accepts reaches the DOM. That includes the dialog's own `onClose`: pass your
 * own to hear about every close. The panel's bookkeeping runs after the handler.
 *
 * The panel is always named by its header's title, so `children` must include
 * a `SidePanel.Header` — the provider warns in development when it does not.
 */
export type SidePanelProviderProps = OwnProps &
  Omit<ComponentProps<"dialog">, keyof OwnProps>;

/**
 * The one requirement {@link withSidePanel} places on the component it wraps:
 * it must accept an `onClick` handler. A trigger that accepts
 * `onClick` but never forwards it to a clickable element never toggles its
 * panel. An `onClick` the consumer passes still runs: the HOC calls it first,
 * then toggles the panel, unless the handler calls `event.preventDefault()`.
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
   * the `<SidePanel>` it returns — `<SidePanel ref={ref}>` — without it the
   * trigger toggles nothing.
   */
  ref: RefObject<SidePanelHandle | null>;
};

/**
 * **Every factory must attach the `ref` it receives to the `<SidePanel>` it
 * returns.** The trigger toggles the panel through that ref — without it the
 * trigger toggles nothing:
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
