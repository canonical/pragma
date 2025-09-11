/* @canonical/generator-ds 0.10.0-experimental.2 */

import type React from "react";
import type { SectionProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds section";

/**
 * The Section component is used to group related content.
 * @returns {React.ReactElement} - Rendered Section
 * @implements syntax:core:component:section:1.0.0
 */
const Section = ({
  className,
  children,
  prominence,
  ...props
}: SectionProps): React.ReactElement => {
  return (
    <section
      className={[componentCssClassName, prominence, className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </section>
  );
};

export default Section;
