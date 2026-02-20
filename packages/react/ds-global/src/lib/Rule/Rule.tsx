import type React from "react";
import type { RuleProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds rule";

/**
 * A component that separates content into logical groups.
 * @TODO implement fixed-width behavior after implementation of the Grid
 * @implements ds:site.component.rule
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
