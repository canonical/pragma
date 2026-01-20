/* @canonical/generator-ds 0.10.0-experimental.2 */

import type React from "react";
import type { ImageProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds card-image";

/**
 * Image component for Card
 * Full-width image with content bleed (no padding)
 * @returns {React.ReactElement} - Rendered Image
 */
const Image = ({
  className,
  alt,
  ...props
}: ImageProps): React.ReactElement => {
  return (
    <img
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      alt={alt}
      {...props}
    />
  );
};

Image.displayName = "Card.Image";

export default Image;
