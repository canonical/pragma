import type React from "react";
import { useEffect, useId, useRef } from "react";
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
 * than from JavaScript. `open` is controlled: dismissal — the close button,
 * Escape, or the backdrop — is reported through `onOpenChange`, and the modal
 * closes when the consumer sets `open` to `false`. Escape always closes the
 * modal: `onOpenChange` is where the consumer does pre-close work, not a
 * chance to refuse.
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
  open,
  onOpenChange,
  closeOnBackdropClick = false,
  children,
  className,
  ...props
}: ModalProps): React.ReactElement => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    // When open changes this effect is executed. According to the value open has
    // the modal closes or opens
    // This is the reason why modal need to know open

    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      // showModal() displays a native dialog
      dialog.showModal();
    } else if (!open && dialog.open) {
      // close() closes a native dialog
      dialog.close();
    }
  }, [open]);

  const requestClose = (): void => onOpenChange?.(false);

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: the click handler only identifies clicks landing on the backdrop, which has no keyboard equivalent; keyboard dismissal is Escape, handled natively by the dialog's cancel event
    <dialog
      ref={dialogRef}
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      // The composed Header sets this id on its title, which names the dialog;
      // a modal without a header must supply aria-label, which passes through
      // `props` (and overrides this attribute when provided).
      aria-labelledby={titleId}
      // Escape fires `cancel` natively.
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      // The platform can close the dialog without going through our handlers:
      // a first Escape is canceled above, but a repeated Escape closes it over
      // our head. Report that so the consumer's `onOpenChange` sets `open` to
      // `false` and keeps it matching the DOM — otherwise the two desync and
      // reopening becomes impossible, because neither `open` nor the effect's
      // deps ever change.

      onClose={() => {
        if (open) {
          requestClose();
        }
      }}
      // A click landing on the <dialog> itself is a backdrop click: the box has
      // no padding of its own, so every inner pixel belongs to a child.
      onClick={(event) => {
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
