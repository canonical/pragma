import type { ComponentType, FC, ReactElement } from "react";
import { useRef } from "react";
import Modal from "./Modal.js";
import type {
  WithModalChildren,
  WithModalOptions,
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
 * ```tsx
 * const OpenButton = withModal(Button, <Modal.Content>Hello</Modal.Content>);
 * <OpenButton>Open</OpenButton>;
 * ```
 *
 * **How it closes:** the header's X button and Escape always work. Add
 * `closeOnBackdropClick` to `modalProps` and a backdrop click works too.
 *
 * **Footer buttons can only close the modal.** That is the one and only
 * action this HOC provides. To wire one up, pass the content as a function —
 * it receives a `close` callback:
 *
 * ```tsx
 * const OpenButton = withModal(
 *   Button,
 *   (close) => (
 *     <Modal.Footer>
 *       <Button onClick={close}>Got it</Button>
 *     </Modal.Footer>
 *   ),
 * );
 * ```
 *
 * If an action needs to do more than close — save data, open another modal,
 * close conditionally — don't use this HOC: compose `Modal` directly and drive
 * it through its `ref`.
 *
 * `withModal` is meant for static content: its content is created once, when
 * the HOC is called. If the modal must show data from the parent — for example
 * a different `userName` depending on which user is selected — don't use this
 * HOC either; compose `Modal` directly and drive it through its `ref`.
 *
 * A pure composition wrapper: it renders the wrapped component and the modal
 * as siblings, so it carries no root element of its own.
 *
 * @param Component The trigger component to wrap (e.g. `Button`). It must accept `onClick` and forward it to its root element; clicking it opens the modal.
 * @param modalChildren The modal's content: plain JSX, or a function that receives `close` and returns JSX.
 * @param modalProps Props forwarded to the underlying `Modal` (e.g. `closeOnBackdropClick`), minus `ref` and `children`, which the HOC owns.
 */
const withModal = <TProps extends WithModalTriggerProps>(
  Component: ComponentType<TProps>,
  modalChildren: WithModalChildren,
  modalProps: WithModalOptions = {},
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
        {/* The props the HOC owns come last, after the spread. `WithModalOptions`
            omits the ref, but a structurally typed variable can still carry one,
            and it may not be allowed through: a stray `ref` would unwire the
            trigger. */}
        <Modal {...modalProps} ref={dialogRef}>
          {typeof modalChildren === "function"
            ? modalChildren(close)
            : modalChildren}
        </Modal>
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
