/* @canonical/generator-ds 0.10.0-experimental.2 */

import type { AnchorHTMLAttributes, ReactNode } from "react";

export interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  /* Additional CSS classes */
  className?: string;
  /* Child elements */
  children?: ReactNode;
  /* Link variant */
  appearance?: "soft";

  /**
   * A node to render inline with the link when it is hovered
   * @migration 1.0.0 - previously, only Anchor link icons were supported. Now, arbitrary content can be shown on interaction.
   * */
  activationContents?: ReactNode;

  /**
   * @migration 1.0.0 - inverted links are not migrated from Vanilla as they have been deprecated.
   */

  /**
   * TODO also study TopLink https://vanillaframework.io/docs/patterns/links#back-to-top
   */
}
