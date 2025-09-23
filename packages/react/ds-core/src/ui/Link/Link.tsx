/* @canonical/generator-ds 0.10.0-experimental.2 */

import type { ElementType, ReactElement } from "react";
import type { LinkProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds link";

/**
 * Link component that can be rendered as different elements while maintaining consistent styling
 * @implements syntax:core:component:link:1.0.0
 */
const Link = <TElement extends ElementType = "a">({
  as,
  className,
  children,
  appearance,
  ...props
}: LinkProps<TElement>): ReactElement => {
  const Component = as || "a";

  return (
    <Component
      className={[componentCssClassName, className, appearance]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </Component>
  );
};

export default Link;
