import type {
  ComponentProps,
  MouseEventHandler,
  ReactElement,
  ReactNode,
  RefCallback,
  RefObject,
} from "react";

type OwnProps = {
  /**
   * The handle on the underlying `<dialog>`, and the only way the modal opens:
   * `ref.current?.showModal()`, with `ref.current?.close()` closing it. The prop
   * is required because the modal is only ever opened through `showModal()`, so
   * a modal with no ref is a modal that can never open — every modal gets a ref
   * one way or another: {@link withModal} hands its factory the ref to attach, a
   * directly-composed modal driven by a trigger takes a stored ref, and an
   * open-on-mount modal takes an inline callback ref. Requiring the prop turns
   * the {@link withModal} factory's one duty — attaching the ref it receives —
   * into a compile error instead of a silent nothing.
   *
   * `showModal()` throws on a dialog that is already open. A trigger sitting
   * on the page cannot be clicked while the modal holds it inert, so it needs
   * no guard; anything that can fire twice — a keyboard shortcut, an effect —
   * should check `ref.current.open` first.
   */
  ref: RefCallback<HTMLDialogElement> | RefObject<HTMLDialogElement | null>;
  /**
   * Whether clicking the backdrop dismisses the modal. Defaults to `false`, so
   * backdrop dismissal is opt-in: a stray click outside the dialog cannot
   * discard the task it holds. Independent of the header's `undismissible`.
   */
  closeOnBackdropClick?: boolean;
  /**
   * The composed sections — `Modal.Header`, `Modal.Content` and
   * `Modal.Footer`, in that order. The header and footer are optional; the
   * content carries the main information the modal conveys.
   */
  children: ReactNode;
};

/**
 * Props for the Modal pattern
 *
 * @implements ds:global.pattern.modal
 *
 * `title` is omitted from the native attributes of the dialog because the DOM `title`
 * attribute is a tooltip, while here it would name the modal — which the
 * composed `Modal.Header` does instead.
 *
 * `open` is omitted because a `<dialog>` carrying the `open` attribute is
 * *non-modal*: no top layer, no backdrop, no focus trap. The modal is only
 * ever opened through `showModal()`, so the open state lives in the DOM
 * element and not in a prop. Use the `ref` to open or close it.
 *
 * `onClose` is *not* omitted: the native `close` event is how a consumer hears
 * that the modal is gone, whichever way out the user took, and it replaces the
 * `onOpenChange` callback a controlled modal would need. It does not say *which*
 * way out that was — an action that needs to be told apart from a dismissal
 * should close the modal with `ref.current?.close(value)` and read
 * `event.currentTarget.returnValue`.
 */
export type ModalProps = OwnProps &
  Omit<ComponentProps<"dialog">, keyof OwnProps | "title" | "open">;

/**
 * The shared modal API threaded to the composed subcomponents through the
 * Modal context: the id the dialog's `aria-labelledby` points at (set on the
 * Header's title, which is what gives the dialog its accessible name), and
 * the dismissal that closes the dialog (what the Header's close button calls).
 */
export interface ModalContextValue {
  /**
   * The id the dialog's `aria-labelledby` points at. The Header sets it on the
   * title, which is what gives the dialog its accessible name.
   */
  titleId: string;
  /** Closes the dialog. What the Header's close button calls. */
  onDismiss: () => void;
}

/**
 * The one requirement {@link withModal} places on the component it wraps: it
 * must accept an `onClick` handler. The HOC composes its open handler onto
 * the trigger itself — no wrapper element — so a trigger that accepts
 * `onClick` but never forwards it to a clickable element never opens its
 * modal. An `onClick` the consumer passes still runs: the HOC calls it first,
 * then opens the modal.
 *
 * The event is typed against plain `Element` so triggers rooted at any
 * element — `<button>`, `<a>`, a clickable `<span>` — satisfy the constraint:
 * React's event handlers are bivariant (the `bivarianceHack`), so a
 * `MouseEventHandler<HTMLButtonElement>` prop fits where a
 * `MouseEventHandler<Element>` is expected.
 */
export type WithModalTriggerProps = {
  onClick?: MouseEventHandler<Element>;
};

/**
 * The props the modal element returned by a {@link WithModalRender} carries:
 * everything `Modal` accepts — including the required `ref`, which the factory
 * sets on the `<Modal>` so the trigger can open it.
 */
export type WithModalModalProps = ModalProps;

/**
 * What {@link withModal} hands a {@link WithModalRender} function: a props
 * object.
 */
export type WithModalRenderProps = {
  /** Closes the modal. What a footer button wires its `onClick` to. */
  close: () => void;
  /**
   * The handle on the `<dialog>` the trigger opens. The factory MUST set it
   * on the `<Modal>` it returns — `<Modal ref={ref}>`. `Modal` requires its
   * `ref`, so a factory that forgets it fails to compile.
   */
  ref: RefObject<HTMLDialogElement | null>;
};

/**
 * The second argument of {@link withModal}: a render contract. The HOC calls
 * it during render with a {@link WithModalRenderProps} object — `{ close,
 * ref }` — and it returns the complete `<Modal>` element.
 *
 * **Every factory must attach the `ref` it receives to the `<Modal>` it
 * returns.** The trigger opens the dialog through that ref. `Modal` requires
 * its `ref`, so a factory that forgets it fails to compile:
 *
 * `({ ref }) => <Modal ref={ref}>…</Modal>`
 *
 * or, with a footer button that closes the modal:
 *
 * `({ close, ref }) => <Modal ref={ref}><Modal.Footer><Button onClick={close}>Got it</Button></Modal.Footer></Modal>`
 *
 * A footer action can only close. If it must do more — submit data, close
 * conditionally, open another modal — skip the HOC and compose `Modal`
 * directly, driving it through its `ref`.
 */
export type WithModalRender = (
  props: WithModalRenderProps,
) => ReactElement<WithModalModalProps>;
