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
 * @implements ds:global.subcomponent.modal-header
 */
const Header = ({
  children,
  titleId,
  dismissible = true,
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
      {/* DSL edges[0]: title (cardinality: 1) */}
      <span className="title" id={titleId ?? modal.titleId}>
        {children}
      </span>
      {/* DSL edges[1]: close button (cardinality: 0..1) */}
      {dismissible && (
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
