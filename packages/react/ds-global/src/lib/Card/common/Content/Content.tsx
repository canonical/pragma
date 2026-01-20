/* @canonical/generator-ds 0.10.0-experimental.2 */

import type React from "react";
import type { ContentProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds card-content";

/**
 * Content component for Card
 *
 * @implements ds:global.subcomponent.card-content
 * @returns {React.ReactElement} - Rendered Content
 */
const Content = ({
  children,
  className,
  ...props
}: ContentProps): React.ReactElement => {
  return (
    <div
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
    </div>
  );
};

Content.displayName = "Card.Content";

export default Content;
