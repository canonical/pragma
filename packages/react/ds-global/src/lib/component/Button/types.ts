import type { IconName } from "@canonical/ds-assets";
import type { ModifierFamily } from "@canonical/ds-types";
import type { ComponentProps, ReactNode } from "react";

/**
 * The Button's DS-owned props. Native `<button>` attributes (`id`, `className`,
 * `type`, `disabled`, event handlers, …) come from `ComponentProps<"button">`
 * in {@link default | ButtonProps}, so only genuinely design-system-specific
 * members live here.
 */
type OwnProps = {
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
   * Whether the button is in a loading (busy) state. Overlays a Spinner,
   * marks the button `aria-busy` and `aria-disabled`, and blocks activation
   * (clicks and form submission) so the action cannot be triggered again
   * while it is in flight. The button stays focusable, so keyboard focus is
   * not lost when loading starts.
   *
   * Passing `loading` (even as `false`) also renders a visually hidden
   * `role="status"` region after the button that announces `loadingLabel`
   * while loading. Pass it from the first render so the region exists before
   * it is needed.
   */
  loading?: boolean;
  /**
   * Text announced by assistive technology when `loading` becomes true.
   * @default "Loading"
   */
  loadingLabel?: string;
};

type Props = OwnProps & Omit<ComponentProps<"button">, keyof OwnProps>;

export type { Props as default };
