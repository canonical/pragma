/* @canonical/generator-ds 0.10.0-experimental.2 */

import type React from "react";
import type { ReactElement } from "react";
import type { IconProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds icon";

/**
 * Icon component that renders SVG icons from @canonical/ds-assets
 * @param iconName - Name of the icon to render
 * @param size - Size of the icon (sm, md, lg)
 * @param rootPath - Root path to the icons (default: /assets/icons)
 * @param width - Width of the icon (default: "16")
 * @param height - Height of the icon (default: "16")
 * @param className - Additional CSS classes
 * @returns {React.ReactElement} - Rendered Icon SVG
 * @implements syntax:core:component:icon:1.0.0
 */
const Icon = ({
  icon,
  alt,
  className,
  width = "16",
  height = "16",
  size = "md",
  rootPath = "/assets/icons",
  ...props
}: IconProps): ReactElement => {
  return (
    <img
      src={`${rootPath}/${icon}.svg`}
      className={[componentCssClassName, className, size && `size-${size}`]
        .filter(Boolean)
        .join(" ")}
      alt={alt}
      {...props}
    />
  );
};

export default Icon;
