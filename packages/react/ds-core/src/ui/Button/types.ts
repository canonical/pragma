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
   * This will also be used for the `aria-label`.
   * If this contains anything other than a string literal (such as a <p> element), you should specify an
   * `aria-label` prop to ensure that the button label is applied properly. Otherwise, the label will be set to [object Object].
   * TODO remove optional when we remove the `label` prop.
   * */
  children?: ReactNode;
  // for backwards compatibility, when we used label instead of children
  label?: string;
  /** The visual style of the button */
  appearance?: "neutral" | "base" | "positive" | "negative" | "link";
  /** Optional click handler */
  onClick?: () => void;
}

type Props = BaseProps & ButtonHTMLAttributes<HTMLButtonElement>;

export default Props;
