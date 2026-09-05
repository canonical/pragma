import type { IconName } from "@canonical/ds-assets";
import type { ComponentProps } from "react";

type OwnProps = {
  /** Identity field, mirroring LeafNavItem.key — not spread to the DOM. */
  key?: string;
  /** Display text — also the switch's accessible name (wrapping `<label>`). */
  label?: string;
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
