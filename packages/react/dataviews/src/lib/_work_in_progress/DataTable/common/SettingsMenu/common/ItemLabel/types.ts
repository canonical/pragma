import type { MenuItem } from "@canonical/react-ds-global";

/**
 * Props of a settings menu item's label.
 *
 * Exempt from the native-prop extension convention: an internal renderer the
 * design system's menu mounts for each item, given only the item, forwarding
 * no caller's native props.
 */
export type ItemLabelProps = {
  /** The item the design system's menu renders this label for. */
  readonly item: MenuItem;
};
