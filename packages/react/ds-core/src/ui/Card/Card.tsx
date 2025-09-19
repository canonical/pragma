/* @canonical/generator-ds 0.10.0-experimental.2 */

import type React from "react";
import { Image, Section, Thumbnail } from "./common/index.js";
import type { CardProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds card";

/**
 * Card component
 * @implements syntax:core:component:card:1.0.0
 */
const Card = ({
  className,
  children,
  emphasis = "neutral",
  ...props
}: CardProps): React.ReactElement => (
  <div
    className={[componentCssClassName, emphasis, className]
      .filter(Boolean)
      .join(" ")}
    {...props}
  >
    {children}
  </div>
);

Card.Thumbnail = Thumbnail;
Card.Image = Image;
Card.Section = Section;

export default Card;
