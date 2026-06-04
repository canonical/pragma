import type React from "react";
import { NavTree } from "../NavTree/index.js";
import type { FooterProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds footer";

/**
 * SideNavigation.Footer — optional region pinned to the bottom, holding
 * account-level or global actions. Drives its own useNavigationTree over its
 * `root` (independent of Content). Falls back to `children` when no `root`.
 *
 * @implements ds:apps.subcomponent.side-navigation-footer
 */
const Footer = ({
  className,
  root,
  LinkComponent = "a",
  currentUrl,
  children,
  ...props
}: FooterProps): React.ReactElement => {
  return (
    <div
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      {...props}
    >
      {root ? (
        <NavTree
          root={root}
          currentUrl={currentUrl}
          LinkComponent={LinkComponent}
        />
      ) : (
        children
      )}
    </div>
  );
};

export default Footer;
