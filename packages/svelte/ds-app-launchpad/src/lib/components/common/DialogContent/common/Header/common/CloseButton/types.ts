/* @canonical/generator-ds 0.10.0-experimental.2 */

import type { ButtonProps } from "../../../../../../Button/index.js";

export type CloseButtonProps = Omit<
  Extract<ButtonProps, { href?: never }>,
  "children" | "iconLeft" | "iconRight" | "severity" | "density"
>;
