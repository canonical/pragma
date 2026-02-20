import type { ElementType, ReactElement } from "react";
import type { LinkProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds link";

/**
 * Link component that can be rendered as different elements while maintaining consistent styling
 * @implements ds:global.component.link
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
