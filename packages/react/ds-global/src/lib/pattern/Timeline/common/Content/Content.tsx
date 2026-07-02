import type React from "react";
import type { ContentProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds timeline-content";

/**
 * Timeline.Content subcomponent
 *
 * Container for Timeline.Event elements.
 *
 * @implements ds:global.subcomponent.timeline-content
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
    {/* DSL edges[0]: timeline-event (cardinality: 0..*) */}
    {children}
  </div>
);

Content.displayName = "Timeline.Content";

export default Content;
