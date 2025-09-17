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
  /** Content to show on hover/focus */
  // TODO consider removing this from here for simplicity's sake, consider its use case as a separate component like "Anchor Link"? https://vanillaframework.io/docs/patterns/links#anchor-link
  activationContents?: ReactNode;
}

export type LinkProps<TElement extends ElementType = "a"> =
  PolymorphicComponentProps<LinkOwnProps, TElement>;
