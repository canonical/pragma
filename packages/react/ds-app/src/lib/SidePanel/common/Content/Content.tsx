import type React from "react";
import type { ContentProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds side-panel-content";

/**
 * Body of a SidePanel, and the only part of it that scrolls: however tall its
 * children are, the header and footer stay visible.
 *
 * The pane is its own scroll container, so it is a tab stop: a keyboard
 * user tabs to it and scrolls it with the arrow and page keys, even when it
 * holds nothing focusable.
 *
 * @implements ds:apps.subcomponent.side_panel-content
 */
const Content = ({
  children,
  className,
  fill = false,
  ...props
}: ContentProps): React.ReactElement => {
  return (
    <div
      className={[componentCssClassName, fill && "fill", className]
        .filter(Boolean)
        .join(" ")}
      // A scroll container a keyboard user cannot focus cannot be scrolled,
      // so the pane is a tab stop. Set before the spread, so the native prop
      // can still take it out of the tab order.
      // biome-ignore lint/a11y/noNoninteractiveTabindex: focus is what makes the scroll region keyboard-operable.
      tabIndex={0}
      {...props}
    >
      {children}
    </div>
  );
};

Content.displayName = "SidePanel.Content";

export default Content;
