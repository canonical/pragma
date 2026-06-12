// TODO: this is how appearance could work as enum
//
// export enum ButtonAppearance {
//   DEFAULT = "default",
//   BASE = "base",
//   POSITIVE = "positive",
//   NEGATIVE = "negative",
//   LINK = "link",
// }
//

import type { ButtonHTMLAttributes, ReactNode } from "react";

export interface BaseProps {
  /* A unique identifier for the button */
  id?: string;
  /** Additional CSS classes */
  className?: string;
  /**
   * Button contents.
   * String children are also applied as the button's `aria-label`. For
   * non-string children the accessible name comes from the rendered text
   * content; pass an explicit `aria-label` for icon-only buttons.
   * */
  children: ReactNode;
  /** The visual style of the button */
  appearance?: "neutral" | "base" | "positive" | "negative" | "link";
}

type Props = BaseProps & ButtonHTMLAttributes<HTMLButtonElement>;

export default Props;
