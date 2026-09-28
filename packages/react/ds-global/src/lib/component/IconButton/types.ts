import type { IconName } from "@canonical/ds-assets";
import type { ComponentProps } from "react";
import type { Button } from "../Button/index.js";

/**
 * An icon-only button has no visible text, so it must be named explicitly:
 * at least one of `aria-label` or `aria-labelledby` is required.
 */
type AccessibleName =
  | {
      /** The accessible name, announced in place of the missing label. */
      "aria-label": string;
      /** The id of an element whose text names the button. */
      "aria-labelledby"?: string;
    }
  | {
      /** The accessible name, announced in place of the missing label. */
      "aria-label"?: string;
      /** The id of an element whose text names the button. */
      "aria-labelledby": string;
    };

/**
 * The IconButton's DS-owned props. Everything else — importance, anticipation,
 * loading, disabled and every native `<button>` attribute — is Button's, and
 * reaches the Button this component renders.
 */
type OwnProps = {
  /**
   * Name of the design-system icon the button shows, rendered by Button's
   * icon slot (an `@canonical/ds-assets` sprite). Required: it is the button's
   * only visible content.
   */
  icon: IconName;
  /**
   * An icon button has no visible children; name it with `aria-label` or
   * `aria-labelledby` instead.
   */
  children?: never;
} & AccessibleName;

/**
 * Button's props with a required `icon`, no children and a required accessible
 * name. `variant` is also left out: the `link` variant strips the button's
 * chrome and inline padding, which an icon-only button cannot do without
 * losing its square box and its target size.
 */
type Props = OwnProps &
  Omit<ComponentProps<typeof Button>, keyof OwnProps | "variant">;

export type { Props as default };
