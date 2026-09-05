import type React from "react";
import type { GroupHeaderProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds side-navigation-group-header";

/**
 * SideNavigation.GroupHeader — the optional label above a
 * SideNavigation.Group's entries. Purely presentational; rendered by Group
 * when its `label` is set.
 *
 * @implements ds:apps.subcomponent.side-navigation-group-header
 */
const GroupHeader = ({
  children,
  className,
  ...props
}: GroupHeaderProps): React.ReactElement => (
  <span
    className={[componentCssClassName, className].filter(Boolean).join(" ")}
    {...props}
  >
    {children}
  </span>
);

export default GroupHeader;
