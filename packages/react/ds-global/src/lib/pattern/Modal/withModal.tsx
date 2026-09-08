import type { ComponentType, FC, ReactElement } from "react";
import { cloneElement, useRef } from "react";
import type {
  ModalProps,
  WithModalModal,
  WithModalTriggerProps,
} from "./types.js";

/**
 * Wraps a trigger with a modal. Click the trigger → the modal opens.
 *
 * **The wrapped component must accept `onClick`** and forward it to the
 * clickable element at its root — the HOC composes its open handler onto the
 * trigger itself, with no wrapper element in between. An `onClick` the
 * consumer passes keeps working: it runs first, then the modal opens.
 *
 * The second argument is a complete `<Modal>` element — sections, props and
 * all:
 *
 * ```tsx
 * const OpenButton = withModal(
 *   Button,
 *   <Modal>
 *     <Modal.Content>Hello</Modal.Content>
 *   </Modal>,
 * );
 * <OpenButton>Open</OpenButton>;
 * ```
 *
 * Everything `Modal` accepts lives on that element — `closeOnBackdropClick`,
 * `aria-label`, `className` — so the consumer sees the real modal, not an
 * options bag. The one prop the HOC owns is the `ref`: the trigger opens the
 * modal and `close` reads the same handle, so the HOC injects its own ref
 * into the element.
 *
 * **How it closes:** the header's X button and Escape always work. Add
 * `closeOnBackdropClick` to the modal element and a backdrop click works too.
 *
 * **Footer buttons can only close the modal.** That is the one and only
 * action this HOC provides. To wire one up, pass the modal as a function —
 * it receives a `close` callback:
 *
 * ```tsx
 * const OpenButton = withModal(
 *   Button,
 *   (close) => (
 *     <Modal>
 *       <Modal.Footer>
 *         <Button onClick={close}>Got it</Button>
 *       </Modal.Footer>
 *     </Modal>
 *   ),
 * );
 * ```
 *
 * If an action needs to do more than close — save data, open another modal,
 * close conditionally — don't use this HOC: compose `Modal` directly and drive
 * it through its `ref`.
 *
 * `withModal` is meant for static content: its modal is created once, when
 * the HOC is called. If the modal must show data from the parent — for example
 * a different `userId` depending on which user is selected — don't use this
 * HOC either; compose `Modal` directly and drive it through its `ref`.
 *
 * A pure composition wrapper: it renders the wrapped component and the modal
 * as siblings, so it carries no root element of its own.
 *
 * @param Component The trigger component to wrap (e.g. `Button`). It must accept `onClick` and forward it to its root element; clicking it opens the modal.
 * @param modal The modal the trigger opens: a complete `<Modal>` element, or a function that receives `close` and returns one.
 */
const withModal = <TProps extends WithModalTriggerProps>(
  Component: ComponentType<TProps>,
  modal: WithModalModal,
): FC<TProps> => {
  const WrappedComponent = (props: TProps): ReactElement => {
    // The modal owns its open state, so the HOC only needs a handle on the
    // dialog to open it from the trigger and to hand `close` to the content.
    const dialogRef = useRef<HTMLDialogElement>(null);
    // showModal() throws on an already-open dialog. The open modal makes the
    // page inert, so a second trigger click should be impossible — but the
    // guard costs nothing and a thrown error would cost the whole render.
    const open = (): void => {
      const dialog = dialogRef.current;
      if (dialog && !dialog.open) dialog.showModal();
    };
    const close = (): void => dialogRef.current?.close();

    // Elements are immutable, so the HOC cannot attach its ref to the one it
    // was handed — it clones it, injecting the ref it owns. A `ref` the
    // consumer set on the element is replaced: the contract is that the HOC
    // owns the ref, because the trigger is what opens the modal.
    const modalElement = cloneElement(
      (typeof modal === "function"
        ? modal(close)
        : modal) as ReactElement<ModalProps>,
      { ref: dialogRef },
    );

    return (
      <>
        <Component
          {...props}
          onClick={(event) => {
            // The consumer's handler runs first, then the modal opens; a
            // preventDefault or stopPropagation there does not gate the open.
            props.onClick?.(event);
            open();
          }}
        />
        {modalElement}
      </>
    );
  };

  // Set the displayName for easier debugging
  WrappedComponent.displayName = `withModal(${
    Component.displayName || Component.name || "Component"
  })`;

  return WrappedComponent;
};

export default withModal;
