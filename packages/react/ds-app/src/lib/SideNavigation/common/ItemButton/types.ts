import type { IconName } from "@canonical/ds-assets";
import type { ComponentProps, ReactNode } from "react";

type OwnProps = {
  /** Identity field, mirroring LeafNavItem.key — not spread to the DOM. */
  key?: string;
  /** Display text. */
  label?: string;
  /** Leading icon (start slot), by ds-assets icon name. */
  icon?: IconName;
  /** Trailing content (end slot): a badge, count, etc. */
  slot?: ReactNode;
};

/**
 * `type` is excluded in addition to `OwnProps`: this is always a plain
 * action trigger, never a form submit/reset control.
 */
export type ItemButtonProps = OwnProps &
  Omit<ComponentProps<"button">, keyof OwnProps | "type">;
