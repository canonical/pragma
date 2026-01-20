import type React from "react";
import type { HeaderProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds card-header";

/**
 * Card.Header subcomponent
 *
 * A header section for cards with title and optional actions.
 * Follows DSL anatomy:
 * - flow layout (horizontal)
 * - justify: space-between
 * - edges: [0] title, [1] actions
 *
 * @implements ds:global.subcomponent.card-header
 */
const Header = ({
  children,
  actions,
  className,
  ...props
}: HeaderProps): React.ReactElement => (
  <div
    className={[componentCssClassName, className].filter(Boolean).join(" ")}
    {...props}
  >
    {/* edges[0]: title (cardinality: 1, slotName: default) */}
    <div className="title">{children}</div>

    {/* edges[1]: actions (cardinality: 0..1) */}
    {actions && <div className="actions">{actions}</div>}
  </div>
);

Header.displayName = "Card.Header";

export default Header;
