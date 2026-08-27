import type React from "react";
import type { ContentProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds modal-content";

/**
 * Modal.Content subcomponent
 *
 * The open slot holding the modal's main information. It is the only part that
 * scrolls, so the header and footer stay put on long content.
 *
 * @implements ds:global.subcomponent.modal-content
 */
const Content = ({
  children,
  className,
  ...props
}: ContentProps): React.ReactElement => (
  <div
    className={[componentCssClassName, className].filter(Boolean).join(" ")}
    {...props}
  >
    {/* DSL edges[0]: content (cardinality: 1) */}
    {children}
  </div>
);

Content.displayName = "Modal.Content";

export default Content;
