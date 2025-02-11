import type React from "react";

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

export interface BaseProps {
  /* A unique identifier for the button */
  id?: string;
  /** Additional CSS classes */
  className?: string;
  /** The visual style of the button */
  appearance?: "neutral" | "base" | "positive" | "negative" | "link";
  /** Button contents */
  label: string;
  /** Optional click handler */
  onClick?: () => void;
}

type Props = BaseProps & React.ButtonHTMLAttributes<HTMLButtonElement>;

export default Props;
