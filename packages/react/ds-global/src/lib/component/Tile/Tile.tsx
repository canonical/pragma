import type React from "react";
import { Content, Header } from "./common/index.js";
import type { TileProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds tile";

/**
 * The tile component is a flexible surface used to group related information
 * and actions into a single, recognizable unit. It acts as a container that
 * creates a clear boundary between different pieces of content, making complex
 * layouts easier to scan and organize.
 *
 * @implements ds:global.component.tile
 */
const Tile = ({
  children,
  className,
  ...props
}: TileProps): React.ReactElement => (
  <div
    className={[componentCssClassName, className].filter(Boolean).join(" ")}
    {...props}
  >
    {/* DSL edges order: [0] Header, [1] Content */}
    {children}
  </div>
);

Tile.Header = Header;
Tile.Content = Content;

export default Tile;
