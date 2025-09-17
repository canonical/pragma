/* @canonical/generator-ds 0.10.0-experimental.2 */

import { loadIcon } from "@canonical/ds-assets";
import type React from "react";
import type { ReactElement } from "react";
import { useEffect, useState } from "react";
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
  iconName,
  size = "sm",
  className,
  children,
  ...props
}: IconProps): ReactElement => {
  const [svgContent, setSvgContent] = useState("");

  useEffect(() => {
    if (!iconName) return;

    // Load SVG content
    loadIcon(iconName)
      .then(setSvgContent)
      .catch((error) => {
        console.error(`Failed to load icon: ${iconName}`, error);
      });
  }, [iconName]);

  return (
    <span
      className={[
        componentCssClassName,
        className,
        `icon-${iconName}`,
        size && `size-${size}`,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: We control the SVG content source
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
};

export default Icon;
