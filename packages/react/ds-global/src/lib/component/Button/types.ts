import type { IconName } from "@canonical/ds-assets";
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
   * Name of the design-system icon to display before the label, rendered via
   * the `Icon` component (an `@canonical/ds-assets` sprite). The button has a
   * single, leading icon slot — the right-side icon was removed when the
   * select and dropdown affordances became their own components.
   */
  icon?: IconName;
  /**
   * Whether the button is in a loading (busy) state. Replaces the leading icon
   * with a Spinner, marks the button `aria-busy`, and disables interaction so
   * the action cannot be triggered again while it is in flight.
   * @default false
   */
  loading?: boolean;
}

type Props = BaseProps & ButtonHTMLAttributes<HTMLButtonElement>;

export default Props;
