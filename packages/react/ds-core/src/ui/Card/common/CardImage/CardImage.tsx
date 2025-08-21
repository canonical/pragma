/* @canonical/generator-ds 0.10.0-experimental.2 */

import type React from "react";
import type { CardImageProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "image";

/**
 * description of the CardImage component
 * @todo merge with {@link CardThumbnail} ?
 * @returns {React.ReactElement} - Rendered CardImage
 */
const CardImage = ({
  className,
  alt,
  ...props
}: CardImageProps): React.ReactElement => {
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

export default CardImage;
