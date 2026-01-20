/* @canonical/generator-ds 0.10.0-experimental.2 */

import type React from "react";
import type { RuleProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds rule";

/**
 * A component that separates content into logical groups.
 * @TODO implement fixed-width behavior after implementation of the Grid
 * @returns {React.ReactElement} - Rendered Rule
 * @implements syntax:core:component:rule:1.0.0
 */
const Rule = ({
  className,
  emphasis,
  ...props
}: RuleProps): React.ReactElement => {
  return (
    <hr
      className={[componentCssClassName, emphasis, className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
};

export default Rule;
