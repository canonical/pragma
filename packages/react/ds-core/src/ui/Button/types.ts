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

import type { Severity } from "@canonical/ds-types";
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
   * */
  children: ReactNode;
  /**
   * The visual style of the button
   * TODO link button will be a separate component in the future
   * */
  appearance?: Severity | "base" | "link";
}

type Props = BaseProps & ButtonHTMLAttributes<HTMLButtonElement>;

export default Props;
