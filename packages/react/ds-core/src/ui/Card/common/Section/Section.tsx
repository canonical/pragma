/* @canonical/generator-ds 0.10.0-experimental.2 */

import type React from "react";
import type { SectionProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds card-section";

/**
 * Section component for Card
 * @returns {React.ReactElement} - Rendered Section
 */
const Section = ({
  children,
  className,
  isBordered = true,
  ...props
}: SectionProps): React.ReactElement => {
  return (
    <section
      className={[componentCssClassName, className, isBordered && "bordered"]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </section>
  );
};

export default Section;
