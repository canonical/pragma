import type { ComponentProps, ReactNode } from "react";

type OwnProps = {
  /**
   * Whether the modal is shown. Controlled: the consumer owns this state, and
   * the modal asks to change it through `onOpenChange`.
   */
  open: boolean;
  /**
   * Called when the user dismisses the modal — via the close button, Escape,
   * or the backdrop. Escape always closes the modal. Do any pre-close work
   * here, but always set `open` to `false` as well: that state change is what
   * closes the dialog. Skip it and the dismissal will not close the modal —
   * until a repeated Escape lets the platform close it on its own, leaving
   * `open` out of sync with the DOM, and the modal can never be reopened.
   */
  onOpenChange?: (open: boolean) => void;
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
};

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
 * composed `Modal.Header` does instead. `onClose` is omitted because the
 * component owns the native close event and reports dismissal through
 * `onOpenChange`.
 */
export type ModalProps = OwnProps &
  Omit<ComponentProps<"dialog">, keyof OwnProps | "title" | "onClose">;

/**
 * The content of a {@link withModal} modal: plain JSX, or a function.
 *
 * The function form receives the modal's `close` callback — the only action
 * the HOC can hand to the content — so a footer button can close the modal:
 * `<Button onClick={close}>Got it</Button>`.
 *
 * A footer action can only close. If it must do more — submit data, close
 * conditionally, open another modal — skip the HOC and compose the controlled
 * `Modal` with your own `open` state.
 */
export type WithModalChildren = ReactNode | ((close: () => void) => ReactNode);

/**
 * The modal options for {@link withModal}: everything `Modal` accepts except
 * `open`, `onOpenChange`, `children` and `ref`, which the HOC owns or
 * deliberately does not expose.
 */
export type WithModalOptions = Omit<
  ModalProps,
  "open" | "onOpenChange" | "children" | "ref"
>;
