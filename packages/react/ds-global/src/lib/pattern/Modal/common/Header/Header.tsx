import type React from "react";
import { Button } from "../../../../component/Button/index.js";
import { useModalContext } from "../ModalContext.js";
import type { HeaderProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds modal-header";

/**
 * Modal.Header subcomponent
 *
 * Carries the modal title and the optional dismiss control. The title describes
 * what the modal is for, giving the user context on what triggered it. Both the
 * title id (which names the dialog) and the dismiss wiring come from the Modal
 * context, so a composed header needs no props of its own.
 *
 * The title is not a heading element: headings structure the page's document
 * outline, and a modal opens from anywhere in it, so no heading level would be
 * right everywhere. The title names the dialog through `aria-labelledby`
 * instead, which is what a screen reader announces when the modal opens.
 *
 * @implements ds:global.subcomponent.modal-header
 */
const Header = ({
  children,
  titleId,
  undismissible = false,
  dismissLabel = "Close",
  onDismiss,
  className,
  ...props
}: HeaderProps): React.ReactElement => {
  const modal = useModalContext();

  return (
    <header
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      {...props}
    >
      <span className="title" id={titleId ?? modal.titleId}>
        {children}
      </span>
      {!undismissible && (
        <Button
          className="close"
          importance="tertiary"
          icon="close"
          aria-label={dismissLabel}
          onClick={onDismiss ?? modal.onDismiss}
        />
      )}
    </header>
  );
};

Header.displayName = "Modal.Header";

export default Header;
