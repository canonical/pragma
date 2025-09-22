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
  imageProps,
  ...props
}: ThumbnailSectionProps): React.ReactElement => {
  return (
    <Section
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      {...props}
    >
      {/* Must pass alt explicitly to avoid linting error. */}
      <img alt={imageProps.alt} {...imageProps} />
    </Section>
  );
};

ThumbnailSection.displayName = "Card.ThumbnailSection";

export default ThumbnailSection;
