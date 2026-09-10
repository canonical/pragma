import type { ComponentType, ReactElement } from "react";
import { useRef } from "react";
import type { WithModalRender, WithModalTriggerProps } from "./types.js";

/**
 * Wraps a trigger with a modal. Click the trigger → the modal opens.
 *
 * **The wrapped component must accept `onClick`** and forward it to the
 * clickable element at its root — the HOC composes its open handler onto the
 * trigger itself, with no wrapper element in between. An `onClick` the
 * consumer passes keeps working: it runs first, then the modal opens.
 *
 * The second argument is a function: the HOC calls it with a props object
 * carrying `close` and `ref`, and it returns a complete `<Modal>` element —
 * sections, props and all:
 *
 * ```tsx
 * const OpenButton = withModal(
 *   Button,
 *   ({ ref }) => (
 *     <Modal ref={ref}>
 *       <Modal.Content>Hello</Modal.Content>
 *     </Modal>
 *   ),
 * );
 * <OpenButton>Open</OpenButton>;
 * ```
 *
 * Everything `Modal` accepts lives on the element the function returns —
 * `closeOnBackdropClick`, `aria-label`, `className` — so the consumer sees the
 * real modal, not an options bag. **One duty comes with that freedom: the
 * factory must attach the `ref` it receives to the `<Modal>`** (`<Modal
 * ref={ref}>`). The trigger opens the dialog through that ref — forget it and
 * the trigger opens nothing, silently, and TypeScript cannot catch it.
 *
 * **How it closes:** the header's X button and Escape always work. Add
 * `closeOnBackdropClick` to the modal element and a backdrop click works too.
 *
 * **Footer buttons can only close the modal.** That is the one and only
 * action this HOC provides — wire one to the `close` the function receives:
 *
 * ```tsx
 * const confirmationModal: WithModalRender = ({ close, ref }) => (
 *   <Modal ref={ref}>
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
 * @param modal A {@link WithModalRender} function: it receives `{ close, ref }`, must attach `ref` to the `<Modal>` it returns, and the trigger opens it.
 */
const withModal = <TProps extends WithModalTriggerProps>(
  Component: ComponentType<TProps>,
  modal: WithModalRender,
): ComponentType<TProps> => {
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

    // The contract: the HOC hands the factory its own ref, and the factory
    // sets it on the `<Modal>` it returns. TypeScript cannot enforce that
    // `ref={ref}` — a factory that forgets it leaves the trigger opening
    // nothing, silently.
    const modalElement = modal({ close, ref: dialogRef });

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
