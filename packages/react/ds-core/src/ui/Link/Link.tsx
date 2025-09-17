/* @canonical/generator-ds 0.10.0-experimental.2 */

import type { ElementType, ReactElement } from "react";
import { useMemo } from "react";
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
  appearance: appearanceProp,
  activationContents,
  ...props
}: LinkProps<TElement>): ReactElement => {
  const Component = as || "a";
  // If activationContents is provided, the link should be rendered as a soft link
  const appearance = useMemo(
    () => (activationContents ? "soft" : appearanceProp),
    [appearanceProp, activationContents],
  );

  return (
    <Component
      className={[componentCssClassName, className, appearance]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
      {activationContents && (
        <span className="activation-contents">{activationContents}</span>
      )}
    </Component>
  );
};

Link.displayName = "Link";

export default Link;
