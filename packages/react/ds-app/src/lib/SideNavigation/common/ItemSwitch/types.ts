import type { IconName } from "@canonical/ds-assets";
import type { ComponentProps, ReactNode } from "react";

type OwnProps = {
  /** Identity field, mirroring LeafNavItem.key — not spread to the DOM. */
  key?: string;
  /**
   * Content — also the switch's accessible name (wrapping `<label>`).
   * Composed via children (matches `Button`'s own convention); only plain
   * text contributes to the accessible name in the way a screen reader
   * would expect, so keep it to text for the common case.
   */
  children?: ReactNode;
  /** Leading icon (start slot), by ds-assets icon name. */
  icon?: IconName;
  /** Whether the item (and its switch) is interactive. */
  disabled?: boolean;
  /** Controlled checked state. Omit for an uncontrolled switch (see `defaultChecked`). */
  checked?: boolean;
  /** Initial checked state when uncontrolled. */
  defaultChecked?: boolean;
  /** Called when the switch is toggled, with the next checked value. */
  onCheckedChange?: (checked: boolean) => void;
};

export type ItemSwitchProps = OwnProps &
  Omit<ComponentProps<"li">, keyof OwnProps>;
