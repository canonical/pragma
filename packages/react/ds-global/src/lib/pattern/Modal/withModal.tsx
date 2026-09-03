import type { ComponentType, FC, ReactElement } from "react";
import { useState } from "react";
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
 * close conditionally — don't use this HOC: keep the `open` state yourself
 * and compose the controlled `Modal` directly.
 *
 * A pure composition wrapper: it renders the wrapped component and the modal
 * as siblings, so it carries no root element of its own.
 *
 * @param Component The trigger component to wrap (e.g. `Button`). It must accept `onClick` and forward it to its root element; clicking it opens the modal.
 * @param modalChildren The modal's content: plain JSX, or a function that receives `close` and returns JSX.
 * @param modalProps Props forwarded to the underlying `Modal` (e.g. `closeOnBackdropClick`), minus `open`, `onOpenChange` `children` and `ref`, which the HOC owns.
 */
const withModal = <TProps extends WithModalTriggerProps>(
  Component: ComponentType<TProps>,
  modalChildren: WithModalChildren,
  modalProps: WithModalOptions = {},
): FC<TProps> => {
  const WrappedComponent = (props: TProps): ReactElement => {
    const [open, setOpen] = useState(false);
    const close = (): void => setOpen(false);

    return (
      <>
        <Component
          {...props}
          onClick={(event) => {
            // The consumer's handler runs first, then the modal opens; a
            // preventDefault or stopPropagation there does not gate the open.
            props.onClick?.(event);
            setOpen(true);
          }}
        />
        <Modal open={open} onOpenChange={setOpen} {...modalProps}>
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
