/* @canonical/generator-ds 0.10.0-experimental.2 */

import type React from "react";
import type { SectionProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds section";

/**
 * The `<Section>` component groups related content.
 * Sections can have varying visual spacing levels to organize information according to an information hierarchy.
 *
 * @implements syntax:core:component:section:1.0.0
 */
const Section = ({
  className,
  children,
  spacing,
  bordered = false,
  ...props
}: SectionProps): React.ReactElement => {
  return (
    <section
      className={[
        componentCssClassName,
        bordered && "bordered",
        spacing,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </section>
  );
};

export default Section;
