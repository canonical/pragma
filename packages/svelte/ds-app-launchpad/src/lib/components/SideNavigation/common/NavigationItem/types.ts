import type { Snippet } from "svelte";
import type { ButtonPrimitiveProps } from "../../../../components/common";

export type NavigationItemProps = ButtonPrimitiveProps & {
  /**
   * Whether the item should appear selected.
   */
  selected?: boolean;
  /**
   * An optional icon to be displayed alongside the item text.
   */
  icon?: Snippet<[]>;
  /**
   * Content to be displayed inside the item.
   */
  children: Snippet<[]>;
};
