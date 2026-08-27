import type React from "react";
import type { FooterProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds modal-footer";

/**
 * Modal.Footer subcomponent
 *
 * Holds the modal's actions. When the modal is a confirmation or a form, these
 * capture the decision; the button's modifiers must match the consequence, so a
 * destructive confirmation uses a destructive button.
 *
 * @implements ds:global.subcomponent.modal-footer
 */
const Footer = ({
  children,
  className,
  ...props
}: FooterProps): React.ReactElement => (
  <footer
    className={[componentCssClassName, className].filter(Boolean).join(" ")}
    {...props}
  >
    {/* DSL edges[0]: button (cardinality: 0..*) */}
    {children}
  </footer>
);

Footer.displayName = "Modal.Footer";

export default Footer;
