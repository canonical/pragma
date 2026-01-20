import type React from "react";
import type { ContentProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds tile-content";

/**
 * Tile.Content subcomponent
 *
 * Main content area for a Tile.
 *
 * @implements ds:global.subcomponent.tile-content
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
    {children}
  </div>
);

Content.displayName = "Tile.Content";

export default Content;
