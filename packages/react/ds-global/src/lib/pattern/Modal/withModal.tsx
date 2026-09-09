import type { ComponentType, FC, ReactElement } from "react";
import { cloneElement, useRef } from "react";
import type {
  ModalProps,
  WithModalRender,
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
 * The second argument is a function: the HOC calls it with a props object
 * carrying `close`, and it returns a complete `<Modal>` element — sections,
 * props and all:
 *
 * ```tsx
 * const OpenButton = withModal(
 *   Button,
 *   () => (
 *     <Modal>
 *       <Modal.Content>Hello</Modal.Content>
 *     </Modal>
 *   ),
 * );
 * <OpenButton>Open</OpenButton>;
 * ```
 *
 * Everything `Modal` accepts lives on the element the function returns —
 * `closeOnBackdropClick`, `aria-label`, `className` — so the consumer sees the
 * real modal, not an options bag. The one prop the HOC owns is the `ref`: the
 * trigger opens the modal and `close` reads the same handle, so the HOC
 * injects its own ref into the returned element.
 *
 * **How it closes:** the header's X button and Escape always work. Add
 * `closeOnBackdropClick` to the modal element and a backdrop click works too.
 *
 * **Footer buttons can only close the modal.** That is the one and only
 * action this HOC provides — wire one to the `close` the function receives:
 *
 * ```tsx
 * const confirmationModal: WithModalRender = ({ close }) => (
 *   <Modal>
 *     <Modal.Footer>
 *       <Button onClick={close}>Got it</Button>
 *     </Modal.Footer>
 *   </Modal>
 * );
 *
 * const OpenButton = withModal(Button, confirmationModal);
 * ```
 *
 * If an action needs to do more than close — save data, open another modal,
 * close conditionally — don't use this HOC: compose `Modal` directly and drive
 * it through its `ref`.
 *
 * `withModal` is meant for static content and belongs at module scope, called
 * once. The function it is handed is invoked on every render of the trigger,
 * but at module scope it can only see module-level values, so what it returns
 * is the same on every render. If the modal must show data from the parent —
 * for example a different `userId` depending on which user is selected —
 * don't call this HOC inside the component; compose `Modal` directly and
 * drive it through its `ref`.
 *
 * A pure composition wrapper: it renders the wrapped component and the modal
 * as siblings, so it carries no root element of its own.
 *
 * `import { withModal } from "@canonical/react-ds-global";`
 *
 * @param Component The trigger component to wrap (e.g. `Button`). It must accept `onClick` and forward it to its root element; clicking it opens the modal.
 * @param modal A {@link WithModalRender} function: it receives `{ close }` and returns the complete `<Modal>` element the trigger opens.
 */
const withModal = <TProps extends WithModalTriggerProps>(
  Component: ComponentType<TProps>,
  modal: WithModalRender,
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

    // Elements are immutable, so the HOC cannot attach its ref to the one the
    // function returns — it clones it, injecting the ref it owns. A `ref` the
    // consumer set on the element is replaced: the contract is that the HOC
    // owns the ref, because the trigger is what opens the modal.
    const modalElement = cloneElement(
      modal({ close }) as ReactElement<ModalProps>,
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
