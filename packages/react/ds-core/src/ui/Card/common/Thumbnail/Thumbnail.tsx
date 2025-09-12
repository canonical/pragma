/* @canonical/generator-ds 0.10.0-experimental.2 */

import type React from "react";
import Section from "../Section/Section.js";
import type { ThumbnailProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds card-thumbnail";

/**
 * Thumbnail component for Card thumbnails
 * Extends Section behavior with thumbnail image
 */
const Thumbnail = ({
  className,
  alt,
  ...props
}: ThumbnailProps): React.ReactElement => {
  return (
    <Section>
      <img
        className={[componentCssClassName, className].filter(Boolean).join(" ")}
        alt={alt}
        {...props}
      />
    </Section>
  );
};

Thumbnail.displayName = "Card.Thumbnail";

export default Thumbnail;
