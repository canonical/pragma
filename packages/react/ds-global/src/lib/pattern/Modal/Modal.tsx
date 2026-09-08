import type React from "react";
import type { RefCallback } from "react";
import { useCallback, useEffect, useId, useRef } from "react";
import { Content, Footer, Header } from "./common/index.js";
import ModalContext from "./common/ModalContext.js";
import type { ModalProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds modal";

/**
 * A modal is a focused container that sits on top of the main view, requiring
 * users to interact with it before returning to that view. Its purpose is to
 * capture the user's full attention for a specific, self-contained task while
 * keeping their workspace visible, though inactive, behind it.
 *
 * It renders a native `<dialog>` opened with `showModal()`, so the backdrop,
 * focus trap, page inertness and Escape handling come from the platform rather
 * than from JavaScript. The modal is self-contained: the open state lives in
 * the `<dialog>` element, not in a prop, so the header's close button and
 * Escape close it — and a backdrop click too, once `closeOnBackdropClick` opts
 * in — without the consumer wiring anything. `onClose` is the native way to
 * hear about it. External control is optional and goes through the `ref`:
 * `ref.current?.showModal()` opens the modal and `ref.current?.close()` closes
 * it. Pass `defaultOpen` to have it open on mount.
 *
 * The sections are composed by the consumer: render
 * `Modal.Header`, `Modal.Content` and `Modal.Footer` as children and choose
 * which ones to show. The header's title names the dialog automatically; a
 * modal composed without a header must carry its own `aria-label`.
 *
 * `import { Modal } from "@canonical/react-ds-global";`
 *
 * @implements ds:global.pattern.modal
 */
const Modal = ({
  ref,
  defaultOpen = false,
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
  const titleId = useId();

  // `defaultOpen` is uncontrolled, so only its mount value counts.
  const opensOnMount = useRef(defaultOpen);

  useEffect(() => {
    if (!opensOnMount.current) return;
    // One-shot: once the starting state has been acted on, no later run can
    // reopen a modal the user has closed.
    opensOnMount.current = false;
    const dialog = dialogRef.current;
    // showModal() is what puts the dialog in the top layer — the `open`
    // attribute alone would render it inline and non-modal — and it throws if
    // the dialog is open already, which a consumer's own ref may have done
    // before this effect ran.
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const requestClose = (): void => dialogRef.current?.close();

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
      //
      // A click landing on the <dialog> itself is a backdrop click: the box has
      // no padding of its own, so every inner pixel belongs to a child. The
      // consumer's own handler is called first and composed with, not replaced
      // — a spread would silently drop backdrop dismissal.
      onClick={(event) => {
        onClick?.(event);
        if (closeOnBackdropClick && event.target === event.currentTarget) {
          requestClose();
        }
      }}
      {...props}
    >
      {/* DSL edges composed by the consumer: Header (0..1), Content (1), Footer (0..1) */}
      <ModalContext.Provider value={{ titleId, onDismiss: requestClose }}>
        {children}
      </ModalContext.Provider>
    </dialog>
  );
};

Modal.Content = Content;
Modal.Footer = Footer;
Modal.Header = Header;

export default Modal;
