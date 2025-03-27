/* @canonical/generator-ds 0.9.0-experimental.9 */
import type { UseComboboxPropGetters } from "downshift";
import type React from "react";
import type { Option, OptionsProps } from "../../../../types.js";
import type * as utils from "../../utils/index.js";

export type ListProps = {
  /* Additional CSS classes */
  className?: string;
  /* Child elements */
  children?: React.ReactNode;
  /* Inline styles */
  style?: React.CSSProperties;

  items: Option[];

  getMenuProps: UseComboboxPropGetters<Option>["getMenuProps"];

  getItemProps: UseComboboxPropGetters<Option>["getItemProps"];

  highlightedIndex: number;

  convertItemToString: typeof utils.convertItemToString;

  fieldValue: string;

  /* The key to read the value from */
  valueKey: keyof Option;

  /* */
  isOpen: boolean;
};
