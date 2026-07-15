import type { ReactElement } from "react";
import type { IconProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds icon";

/** An empty or whitespace-only label provides no accessible name. */
const hasAccessibleName = (value: string | undefined): boolean =>
  typeof value === "string" && value.trim() !== "";

/**
 * Icon component that renders SVG icons from @canonical/ds-assets
 *
 * `import { Icon } from "@canonical/react-ds-global";`
 *
 * @implements ds:global.component.icon
 */
const Icon = ({
  xmlns = "http://www.w3.org/2000/svg",
  viewBox = "0 0 16 16",
  icon,
  className,
  rootPath = "/icons",
  role,
  animate,
  ...props
}: IconProps): ReactElement => {
  // Icons are decorative by default and hidden from assistive technology.
  // Providing an accessible name (aria-label/aria-labelledby) or an explicit
  // role exposes the icon as a named image instead. An empty label counts as
  // decorative, mirroring the `alt=""` convention on images.
  const isLabelled =
    hasAccessibleName(props["aria-label"]) ||
    hasAccessibleName(props["aria-labelledby"]);

  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: decorative icons render aria-hidden="true"; labelled icons render role="img" with an aria-label/aria-labelledby (computed at runtime)
    <svg
      xmlns={xmlns}
      viewBox={viewBox}
      className={[componentCssClassName, animate, className]
        .filter(Boolean)
        .join(" ")}
      role={role ?? (isLabelled ? "img" : undefined)}
      aria-hidden={isLabelled || role ? undefined : true}
      {...props}
    >
      <use href={`${rootPath}/${icon}.svg#${icon}`} />
    </svg>
  );
};

export default Icon;
