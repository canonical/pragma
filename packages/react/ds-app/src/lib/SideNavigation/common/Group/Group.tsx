import type React from "react";
import { GroupHeader } from "../GroupHeader/index.js";
import type { GroupProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds side-navigation-group";

/**
 * SideNavigation.Group — a named collection of navigation entries, with an
 * optional SideNavigation.GroupHeader. One of NavTree's direct content
 * entries — the 24.04 spec §4.3.
 *
 * @implements ds:apps.subcomponent.side-navigation-group
 */
const Group = ({
  label,
  children,
  className,
  ...props
}: GroupProps): React.ReactElement => (
  <section
    className={[componentCssClassName, className].filter(Boolean).join(" ")}
    {...props}
  >
    {label != null && <GroupHeader>{label}</GroupHeader>}
    <ul className="list">{children}</ul>
  </section>
);

export default Group;
