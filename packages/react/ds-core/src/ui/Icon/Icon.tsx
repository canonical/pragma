/* @canonical/generator-ds 0.10.0-experimental.2 */

import type React from "react";
import type { ReactElement } from "react";
import type { IconProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds icon";

/**
 * Icon component that renders SVG icons from @canonical/ds-assets
 * @param iconName - Name of the icon to render
 * @param size
 * @param className - Additional CSS classes
 * @param children - Child elements
 * @param {IconProps} props - Additional props
 * @returns {React.ReactElement} - Rendered Icon SVG
 * @implements syntax:core:component:icon:1.0.0
 */
const Icon = ({
  xmlns = "http://www.w3.org/2000/svg",
  version = "1.1",
  width = "16",
  height = "16",
  viewBox = "0 0 16 16",
  size = "md",
  icon,
  className,
  rootPath = "/assets/icons",
  ...props
}: IconProps): ReactElement => {
  return (
    <svg
      xmlns={xmlns}
      version={version}
      width={width}
      height={height}
      viewBox={viewBox}
      className={[componentCssClassName, className, size && `size-${size}`]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      <title>{icon}</title>
      <use href={`${rootPath}/${icon}.svg#${icon}`} />
    </svg>
  );
};

export default Icon;
