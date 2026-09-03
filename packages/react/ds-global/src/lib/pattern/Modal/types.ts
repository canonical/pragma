import type { DialogHTMLAttributes, ReactNode, Ref } from "react";

/**
 * Props for the Modal pattern
 *
 * @implements dso:global.pattern.modal
 *
 * Anatomy (from DSL):
 * - layout.type: stack
 * - edges (composed by the consumer):
 *   - [0] backdrop (cardinality: 1) — the native `::backdrop`, no DOM node
 *   - [1] dialog container (cardinality: 1) — the `<dialog>` element itself
 *     - [0] modal-header  (cardinality: 0..1, slotName: header)
 *     - [1] modal-content (cardinality: 1,    slotName: default)
 *     - [2] modal-footer  (cardinality: 0..1, slotName: footer)
 *
 * `title` is omitted from the native attributes because the DOM `title`
 * attribute is a tooltip, while here it would name the modal — which the
 * composed `Modal.Header` does instead.
 *
 * `open` is omitted because a `<dialog>` carrying the `open` attribute is
 * *non-modal*: no top layer, no backdrop, no focus trap. The modal is only
 * ever opened through `showModal()`, so the open state lives in the DOM
 * element and not in a prop. Use `defaultOpen` to open it on mount and `ref`
 * to open or close it later.
 *
 * `onClose` is *not* omitted: the native `close` event is how a consumer hears
 * that the modal is gone, whichever way out the user took, and it replaces the
 * `onOpenChange` callback a controlled modal would need. It does not say *which*
 * way out that was — an action that needs to be told apart from a dismissal
 * should close the modal with `ref.current?.close(value)` and read
 * `event.currentTarget.returnValue`.
 */
export interface ModalProps
  extends Omit<DialogHTMLAttributes<HTMLDialogElement>, "open" | "title"> {
  /**
   * A ref to the underlying `<dialog>`, for the cases that need to drive the
   * modal from outside it: `ref.current?.showModal()` opens it and
   * `ref.current?.close()` closes it. Optional — a modal wired up with
   * {@link withModal}, or one that only has to be dismissed from the inside,
   * needs no ref at all.
   *
   * `showModal()` throws on a dialog that is already open. A trigger sitting
   * on the page cannot be clicked while the modal holds it inert, so it needs
   * no guard; anything that can fire twice — a keyboard shortcut, an effect —
   * should check `ref.current.open` first.
   */
  ref?: Ref<HTMLDialogElement>;
  /**
   * Whether the modal opens as soon as it mounts. Uncontrolled: this is the
   * starting state, not a live one, and later changes are ignored — reopening
   * a closed modal goes through `ref.current?.showModal()`. Defaults to
   * `false`. Note the dialog still renders closed on the server, because
   * `showModal()` is what makes a dialog modal and that only runs on the
   * client.
   */
  defaultOpen?: boolean;
  /**
   * Whether clicking the backdrop dismisses the modal. Defaults to `false`, so
   * backdrop dismissal is opt-in: a stray click outside the dialog cannot
   * discard the task it holds. Independent of the header's `dismissible`.
   */
  closeOnBackdropClick?: boolean;
  /**
   * The composed sections — `Modal.Header`, `Modal.Content` and
   * `Modal.Footer`, in that order. The header and footer are optional; the
   * content carries the main information the modal conveys.
   */
  children: ReactNode;
}

/**
 * The content of a {@link withModal} modal: plain JSX, or a function.
 *
 * The function form receives the modal's `close` callback — the only action
 * the HOC can hand to the content — so a footer button can close the modal:
 * `<Button onClick={close}>Got it</Button>`.
 *
 * A footer action can only close. If it must do more — submit data, close
 * conditionally, open another modal — skip the HOC and compose `Modal`
 * directly, driving it through its `ref`.
 */
export type WithModalChildren = ReactNode | ((close: () => void) => ReactNode);

/**
 * The modal options for {@link withModal}: everything `Modal` accepts except
 * `ref`, `defaultOpen` and `children`. The HOC owns the ref, because the
 * trigger it wraps is what opens the modal, and a modal that starts open has
 * no use for a trigger.
 */
export type WithModalOptions = Omit<
  ModalProps,
  "ref" | "defaultOpen" | "children"
>;
