import type React from "react";
import type { ReactElement } from "react";
import type { IconProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds icon";

/**
 * Icon component that renders SVG icons from @canonical/ds-assets
 * @implements ds:global.component.icon
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
