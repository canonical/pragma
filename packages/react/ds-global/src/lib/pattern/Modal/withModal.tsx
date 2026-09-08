import type { ComponentType, FC, ReactElement } from "react";
import { useRef } from "react";
import Modal from "./Modal.js";
import type { WithModalChildren, WithModalOptions } from "./types.js";

/**
 * Wraps a trigger with a modal. Click the trigger → the modal opens.
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
 * @param Component The trigger component to wrap (e.g. `Button`). Clicking it opens the modal.
 * @param modalChildren The modal's content: plain JSX, or a function that receives `close` and returns JSX.
 * @param modalProps Props forwarded to the underlying `Modal` (e.g. `closeOnBackdropClick`), minus `ref`, `defaultOpen` and `children`, which the HOC owns.
 */
const withModal = <TProps extends object>(
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
        {/*
          The trigger wiring lives on a wrapper span, mirroring the tooltip
          engine: the wrapped component renders untouched inside it, and any
          click it produces — pointer or keyboard activation — bubbles up here
          to open the modal. The span is layout-neutral (`display: contents`,
          see styles.css), so the wrapped component lays out as if unwrapped.
        */}
        {/* biome-ignore lint/a11y/noStaticElementInteractions: the span is a passthrough wrapper; the interactive component inside it handles focus and keyboard activation and bubbles its click here */}
        {/* biome-ignore lint/a11y/useKeyWithClickEvents: keyboard activation of the wrapped control fires a click that bubbles to this handler, so no separate key handler is needed */}
        <span className="ds modal-trigger" onClick={open}>
          <Component {...props} />
        </span>
        {/* The props the HOC owns come last, after the spread. `WithModalOptions`
            omits them, but a structurally typed variable can still carry them,
            and neither may be allowed through: a stray `ref` would unwire the
            trigger, and `defaultOpen` would open a modal nobody asked for. */}
        <Modal {...modalProps} ref={dialogRef} defaultOpen={false}>
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
