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
   * from any cause — the handle, the header's close button, Escape, or the
   * platform itself. Informational: the panel reports what happened, it does
   * not ask permission. Consumers who mirror the state (a toggle button's
   * pressed state, say) follow this; the panel never reads it back.
   */
  onOpenChange?: (open: boolean) => void;
  /**
   * Close when Escape is pressed while focus is inside the panel. Defaults to
   * true. Focus outside the panel belongs to the application, so Escape there
   * is deliberately not intercepted.
   */
  closeOnEscape?: boolean;
  /**
   * Panel contents. Compose from `SidePanel.Header`, `SidePanel.Content` and
   * `SidePanel.Footer`; the header and footer stay put while the content
   * scrolls.
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
 *
 * The panel needs an accessible name: compose a `SidePanel.Header` — its
 * heading names the panel — or pass `aria-label` when the panel has no
 * header. This is a composition obligation, not a runtime check: nothing
 * warns about a panel rendered with neither.
 */
export type SidePanelProps = OwnProps &
  Omit<ComponentProps<"dialog">, keyof OwnProps | "open">;

/**
 * The one requirement {@link withSidePanel} places on the component it wraps:
 * it must accept an `onClick` handler. The HOC composes its toggle handler
 * onto the trigger itself — no wrapper element — so a trigger that accepts
 * `onClick` but never forwards it to a clickable element never toggles its
 * panel. An `onClick` the consumer passes still runs: the HOC calls it first,
 * then toggles the panel.
 *
 * Written in method syntax on purpose: TypeScript checks method parameters
 * bivariantly, which lets a trigger with a more specific event
 * (`MouseEventHandler<HTMLButtonElement>`, say) satisfy this — property
 * syntax would demand the reverse and reject every real trigger.
 */
export type WithSidePanelTriggerProps = {
  onClick?(event: MouseEvent): void;
};

/**
 * The props the panel element returned by a {@link WithSidePanelRender}
 * carries: everything `SidePanel` accepts — including the required `ref`,
 * which the factory sets on the `<SidePanel>` so the trigger can toggle it.
 */
export type WithSidePanelPanelProps = SidePanelProps;

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
 * The second argument of {@link withSidePanel}: a render contract. The HOC
 * calls it during render with a {@link WithSidePanelRenderProps} object —
 * `{ close, ref }` — and it returns the complete `<SidePanel>` element.
 *
 * **Every factory must attach the `ref` it receives to the `<SidePanel>` it
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
) => ReactElement<WithSidePanelPanelProps>;
