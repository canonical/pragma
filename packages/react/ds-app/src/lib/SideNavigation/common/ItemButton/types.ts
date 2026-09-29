import type { IconName } from "@canonical/ds-assets";
import type { ComponentProps, ReactNode } from "react";

type OwnProps = {
  /** Content, composed via children (matches `Button`'s own convention). */
  children?: ReactNode;
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
