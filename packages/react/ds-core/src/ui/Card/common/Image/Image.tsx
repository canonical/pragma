/* @canonical/generator-ds 0.10.0-experimental.2 */

import type React from "react";
import type { ImageProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "card-image";

/**
 * description of the Image component
 * @todo merge with {@link Thumbnail} ?
 * @returns {React.ReactElement} - Rendered Image
 */
const Image = ({
  className,
  alt,
  ...props
}: ImageProps): React.ReactElement => {
  // TODO this is essentially a raw image element, with some extra card image styling (https://github.com/canonical/vanilla-framework/blob/9d319623a01009714b4d364d4e6855b0de09ad8e/scss/_patterns_card.scss#L56-L60)
  //  Should we create an element/component for Image or use a raw <img> element in the card directly?
  return (
    <img
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      alt={alt}
      {...props}
    />
  );
};

export default Image;
