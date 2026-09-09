import type React from "react";
import type { MouseEventHandler, RefCallback } from "react";
import { useCallback, useRef } from "react";
import Context from "./Context.js";
import { Content, Footer, Header } from "./common/index.js";
import useModalState from "./hooks/useModalState.js";
import type { ModalProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds modal";

/**
 * A modal is a focused container that sits on top of the main view, requiring
 * users to interact with it before returning to that view. Its purpose is to
 * capture the user's full attention for a specific, self-contained task while
 * keeping their workspace visible, though inactive, behind it. The main use
 * case is asking the user to confirm a decision they have already taken — for
 * instance, sending a delete request.
 *
 * It renders a native `<dialog>` opened with `showModal()`, so the backdrop,
 * focus trap, page inertness and Escape handling come from the platform rather
 * than from JavaScript. The modal is self-contained: the open state lives in
 * the `<dialog>` element, not in a prop, so the header's close button and
 * Escape close it — and a backdrop click too, once `closeOnBackdropClick` opts
 * in — without the consumer wiring anything. External control is optional and
 * goes through the `ref`: `ref.current?.showModal()` opens the modal and
 * `ref.current?.close()` closes it.
 *
 * There are two consumption patterns, `withModal` and `Modal`. `withModal` is
 * meant for static content: the call belongs at module scope, where the
 * function it is handed can only see module-level values, so the modal it
 * returns is the same on every render. If the modal must show data from the
 * parent — for example a different `userName` depending on which user is
 * selected — compose `Modal` directly and drive it through its `ref`.
 * Otherwise, use `withModal`.
 *
 * The sections are composed by the consumer: render
 * `Modal.Header`, `Modal.Content` and `Modal.Footer` as children and choose
 * which ones to show. The header's title names the dialog automatically; a
 * modal composed without a header must carry its own `aria-label`. Note the
 * title is not a heading element: a modal is a layer on top of the page, not
 * part of its document outline, so the title names the dialog through
 * `aria-labelledby` instead of occupying a heading level.
 *
 * `import { Modal } from "@canonical/react-ds-global";`
 *
 * @implements ds:global.pattern.modal
 */
const Provider = ({
  ref,
  closeOnBackdropClick = false,
  children,
  className,
  onClick,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledby,
  ...props
}: ModalProps): React.ReactElement => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  // The dialog is always attached to the component's own ref, because closing
  // from the inside needs the node whether or not the consumer asked for it. A
  // consumer ref is merged in rather than substituted, which keeps this ref
  // stable across renders and lets the prop take a callback ref too.
  const attachDialog = useCallback<RefCallback<HTMLDialogElement>>(
    (node) => {
      dialogRef.current = node;
      if (typeof ref !== "function") {
        if (ref) ref.current = node;
        return;
      }
      // A React 19 callback ref may return a cleanup function, and React then
      // runs that instead of calling the ref with `null`. Returning it from
      // here — and only here — keeps both conventions intact: the consumer's
      // cleanup runs, or React detaches by calling this callback with `null`.
      const cleanup = ref(node);
      if (typeof cleanup !== "function") return;
      return () => {
        dialogRef.current = null;
        cleanup();
      };
    },
    [ref],
  );
  // The id that names the dialog and the dismissal the header's close button
  // calls — the provider state, centralised in its own hook.
  const { titleId, onDismiss } = useModalState(dialogRef);

  // A click landing on the <dialog> itself is a backdrop click: the box has
  // no padding of its own, so every inner pixel belongs to a child. The
  // consumer's own handler is called first and composed with, not replaced
  // — a spread would silently drop backdrop dismissal.
  const handleClick = useCallback<MouseEventHandler<HTMLDialogElement>>(
    (event) => {
      onClick?.(event);
      if (closeOnBackdropClick && event.target === event.currentTarget) {
        onDismiss();
      }
    },
    [onClick, closeOnBackdropClick, onDismiss],
  );

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: the click handler only identifies clicks landing on the backdrop, which has no keyboard equivalent; keyboard dismissal is Escape, handled natively by the dialog's cancel event
    <dialog
      ref={attachDialog}
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      // The composed Header sets this id on its title, which names the dialog.
      // A name the consumer gave wins, and it has to be chosen here rather than
      // left to the spread: `aria-labelledby` beats `aria-label` in the
      // accessible-name computation, so pointing at the title unconditionally
      // would silence the `aria-label` a header-less modal must carry.
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledby ?? (ariaLabel ? undefined : titleId)}
      // Escape is not handled here: its `cancel` event closes the dialog as its
      // own default action, which is what the platform's close watchers are
      // for. A consumer that must intervene can pass `onCancel` through
      // `props` and call `preventDefault()` — but only the FIRST Escape is
      // cancelable, so a repeated press closes the modal over that handler's
      // head. Escape is a way out the consumer can delay, not deny; `onClose`
      // is where to hear that it happened.
      onClick={handleClick}
      {...props}
    >
      <Context.Provider value={{ titleId, onDismiss }}>
        {children}
      </Context.Provider>
    </dialog>
  );
};

Provider.Content = Content;
Provider.Footer = Footer;
Provider.Header = Header;

export default Provider;
