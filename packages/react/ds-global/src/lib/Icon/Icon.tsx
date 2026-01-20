/* @canonical/generator-ds 0.10.0-experimental.2 */

import type React from "react";
import type { ReactElement } from "react";
import type { IconProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds icon";

/**
 * Icon component that renders SVG icons from @canonical/ds-assets
 * @param iconName - Name of the icon to render
 * @param rootPath - Root path to the icons (default: /icons)
 * @returns {React.ReactElement} - Rendered Icon SVG
 * @implements syntax:core:component:icon:1.0.0
 */
const Icon = ({
  xmlns = "http://www.w3.org/2000/svg",
  viewBox = "0 0 16 16",
  icon,
  className,
  rootPath = "/icons",
  role = "img",
  ...props
}: IconProps): ReactElement => {
  return (
    <svg
      xmlns={xmlns}
      viewBox={viewBox}
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      role={role}
      {...props}
    >
      <use href={`${rootPath}/${icon}.svg#${icon}`} />
    </svg>
  );
};

export default Icon;
