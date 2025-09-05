/* @canonical/generator-ds 0.10.0-experimental.2 */

import type React from "react";
import { useId } from "react";
import { Header, Image, Inner, Thumbnail } from "./common/index.js";
import type { CardComponent, CardProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds card";

/**
 * Card component
 * @returns {React.ReactElement} - Rendered Card
 * @implements syntax:core:component:card:1.0.0
 */
const Card = ({
  className,
  children,
  emphasis,
  thumbnailOptions,
  titleElement,
  ...props
}: CardProps): React.ReactElement => {
  const titleId = useId();

  return (
    // biome-ignore lint/a11y/useSemanticElements: TODO figure out what to do with this warning
    <div
      aria-labelledby={titleElement ? titleId : undefined}
      className={[componentCssClassName, className, emphasis]
        .filter(Boolean)
        .join(" ")}
      role="group"
      {...props}
    >
      {thumbnailOptions && (
        <>
          <Thumbnail {...thumbnailOptions} />
          <hr className="separator" />
        </>
      )}
      {titleElement && (
        <h3 className="title" id={titleId}>
          {titleElement}
        </h3>
      )}
      <div className="content">{children}</div>
    </div>
  );
};

Card.Header = Header;
Card.Inner = Inner;
Card.Thumbnail = Thumbnail;
Card.Image = Image;

export default Card;
