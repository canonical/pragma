/* @canonical/generator-ds 0.10.0-experimental.2 */

import type { ElementType, ReactNode } from "react";
import type { PolymorphicComponentProps } from "../../lib/index.js";

interface LinkOwnProps {
  /** Additional CSS classes */
  className?: string;
  /** Link contents */
  children?: ReactNode;
  /** Link appearance modifier */
  appearance?: "soft";
}

export type LinkProps<TElement extends ElementType = "a"> =
  PolymorphicComponentProps<LinkOwnProps, TElement>;
