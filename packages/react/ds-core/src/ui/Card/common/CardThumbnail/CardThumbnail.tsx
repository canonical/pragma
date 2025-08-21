/* @canonical/generator-ds 0.10.0-experimental.2 */

import type React from "react";
import type { CardThumbnailProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "thumbnail";

/**
 * CardThumbnail component for Card thumbnails
 */
const CardThumbnail = ({
  className,
  alt,
  ...props
}: CardThumbnailProps): React.ReactElement => {
  return (
    <img
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      alt={alt}
      {...props}
    />
  );
};

export default CardThumbnail;
