/* @canonical/generator-ds 0.10.0-experimental.2 */

import type React from "react";
import Section from "../Section/Section.js";
import type { ThumbnailSectionProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds card-thumbnail-section";

/**
 * ThumbnailSection component for Card thumbnails
 * Extends Section behavior with thumbnail image
 */
const ThumbnailSection = ({
  className,
  alt,
  ...props
}: ThumbnailSectionProps): React.ReactElement => {
  // todo apply componentcssclassname to the wrapper
  return (
    <Section
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
    >
      <img alt={alt} {...props} />
    </Section>
  );
};

ThumbnailSection.displayName = "Card.ThumbnailSection";

export default ThumbnailSection;
