import type React from "react";
import type { ImageProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds card-image";

/**
 * Card.Image subcomponent
 *
 * Full-width image with content bleed (no padding).
 *
 * @implements ds:global.subcomponent.card-image
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
