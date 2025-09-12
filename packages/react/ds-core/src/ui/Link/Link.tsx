/* @canonical/generator-ds 0.10.0-experimental.2 */

import type { ReactElement } from "react";
import { useMemo } from "react";
import type { LinkProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds link";

/**
 * Link component that can be rendered as different elements while maintaining consistent styling
 * @implements syntax:core:component:link:1.0.0
 */
const Link = ({
  as: Wrapper = "a",
  className,
  children,
  appearance: appearanceProp,
  activationContents,
  ...props
}: LinkProps): ReactElement => {
  // If activationContents is provided, the link should be rendered as a soft link
  const appearance = useMemo(
    () => (activationContents ? "soft" : appearanceProp),
    [appearanceProp, activationContents],
  );

  return (
    <Wrapper
      className={[componentCssClassName, className, appearance]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
      {activationContents && (
        <span className="activation-contents">{activationContents}</span>
      )}
    </Wrapper>
  );
};

Link.displayName = "Link";

export default Link;
