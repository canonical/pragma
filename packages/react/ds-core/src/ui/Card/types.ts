/* @canonical/generator-ds 0.10.0-experimental.2 */

import type { HTMLAttributes, ReactNode } from "react";
import type { Header, Image, Inner, Thumbnail } from "./common/index.js";

/**
 * @migration 1.0.0 - `overlay` is no longer supported
 */
export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  // emphasis?: "muted" | "highlighted"; // TODO map this to a global modifier / intent
  /**
   * An optional thumbnail image to display in the card.
   * @migration 1.0.0 - `thumbnail` is now `thumbnailOptions`, a set of HTML attributes, rather than a URL string, to allow more flexibility in how the image is rendered.
   */
  thumbnailOptions?: HTMLAttributes<HTMLImageElement>;
  /**
   * The title of the card.
   * @migration 1.0.0 - Uses `titleElement` instead of `title` from React Components, to allow the `title` prop to be used as a native HTML attribute.
   */
  titleElement?: ReactNode;
}

// Compound component type
export interface CardComponent extends React.FC<CardProps> {
  Header: typeof Header;
  Inner: typeof Inner;
  Thumbnail: typeof Thumbnail;
  Image: typeof Image;
}
