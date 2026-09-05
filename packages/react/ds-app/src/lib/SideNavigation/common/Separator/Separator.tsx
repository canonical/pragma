import type React from "react";
import type { SeparatorProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds side-navigation-separator";

/**
 * SideNavigation.Separator — a plain rule between content sections, a
 * sibling of SideNavigation.Group among the content's direct entries
 * (SPEC.md §4.3). Only meaningful at that top level — a group's own entries
 * are not separated this way.
 *
 * @implements ds:apps.subcomponent.side-navigation-separator
 */
const Separator = ({
  className,
  ...props
}: SeparatorProps): React.ReactElement => (
  <hr
    className={[componentCssClassName, className].filter(Boolean).join(" ")}
    {...props}
  />
);

export default Separator;
