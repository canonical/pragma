import type React from "react";
import type { ContentProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds side-panel-content";

/**
 * Body of a SidePanel, and the only part of it that scrolls: however tall its
 * children are, the header and footer stay visible.
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

Content.displayName = "SidePanel.Content";

export default Content;
