import { Button } from "@canonical/react-ds-global";
import type React from "react";
import { useSidePanelContext } from "../../hooks/index.js";
import type { HeaderProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds side-panel-header";

/**
 * Header for SidePanel. Never scrolls: it stays visible above
 * `SidePanel.Content`, which scrolls on its own.
 *
 * Owns the title the panel is labelled by, and the close button — which is
 * wired through context, so rendering this outside a SidePanel yields a plain
 * title rather than an error.
 *
 * The title is not a heading element: headings structure the page's document
 * outline, and a panel opens from anywhere in it, so no heading level would be
 * right everywhere. The title names the panel through `aria-labelledby`
 * instead, which is what a screen reader announces when the panel opens.
 *
 * @implements ds:apps.subcomponent.side_panel-header
 */
const Header = ({
  children,
  className,
  dismissLabel = "Close panel",
  undismissible = false,
  ...props
}: HeaderProps): React.ReactElement => {
  const context = useSidePanelContext();

  return (
    <div
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      {...props}
    >
      <span className="title" id={context?.titleId}>
        {children}
      </span>
      {context && !undismissible && (
        <Button
          className="close"
          icon="close"
          importance="tertiary"
          onClick={context.close}
          // Icon-only, so the accessible name has to come from here — Button
          // warns in development when it is missing.
          aria-label={dismissLabel}
        />
      )}
    </div>
  );
};

Header.displayName = "SidePanel.Header";

export default Header;
