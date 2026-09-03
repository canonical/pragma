import { Button } from "@canonical/react-ds-global";
import type React from "react";
import { useSidePanelContext } from "../SidePanelContext.js";
import type { HeaderProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds side-panel-header";

/**
 * Header for SidePanel. Never scrolls: it stays visible while
 * `SidePanel.Content` scrolls beneath it.
 *
 * Owns the heading the panel is labelled by, and the close button — which is
 * wired through context, so rendering this outside a SidePanel yields a plain
 * heading rather than an error.
 */
const Header = ({
  children,
  className,
  dismissLabel = "Close panel",
  dismissible = true,
  ...props
}: HeaderProps): React.ReactElement => {
  const context = useSidePanelContext();

  return (
    <div
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      {...props}
    >
      <h2 className="title" id={context?.titleId}>
        {children}
      </h2>
      {context && dismissible && (
        <Button
          className="close"
          icon="close"
          importance="tertiary"
          onClick={context.requestClose}
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
