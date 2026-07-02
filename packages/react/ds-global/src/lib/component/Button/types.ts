import type { ModifierFamily } from "@canonical/ds-types";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export interface BaseProps {
  /** A unique identifier for the button */
  id?: string;
  /** Additional CSS classes */
  className?: string;
  /**
   * Button contents (label text).
   * The button's accessible name derives from its rendered text content,
   * so no `aria-label` is set automatically. Pass an explicit `aria-label`
   * (or `aria-labelledby`) for icon-only buttons without visible text.
   */
  children?: ReactNode;
  /**
   * Visual hierarchy of the button.
   * - `primary`: High prominence, main call-to-action
   * - `secondary`: Medium prominence, supporting actions
   * - `tertiary`: Low prominence, less important actions
   */
  importance?: ModifierFamily<"importance">;
  /**
   * Expected outcome of the action.
   * - `constructive`: Positive outcome (create, save, confirm)
   * - `caution`: Potentially risky action requiring attention
   * - `destructive`: Negative/irreversible outcome (delete, remove)
   */
  anticipation?: ModifierFamily<"anticipation">;
  /**
   * Button variant.
   * - `undefined`: Standard button appearance
   * - `"link"`: Styled as a text link
   */
  variant?: "link";
  /**
   * Icon element to display alongside the label.
   */
  icon?: ReactNode;
  /**
   * Position of the icon relative to the label.
   * @default "start"
   */
  iconPosition?: "start" | "end";
}

type Props = BaseProps & ButtonHTMLAttributes<HTMLButtonElement>;

export default Props;
