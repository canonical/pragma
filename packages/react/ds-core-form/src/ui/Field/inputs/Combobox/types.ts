/* @canonical/generator-ds 0.9.0-experimental.9 */
import type { InputProps, Option, OptionsProps } from "../../types.js";
import type * as utils from "./utils/index.js";

type CommonProps = {
  /** Whether the input is disabled */
  disabled?: boolean;

  placeholder?: string;

  valueKey?: keyof Option;

  openOnReset?: boolean;

  filterItems?: (options: Option[], inputValue: string) => Option[];

  convertItemToString?: typeof utils.convertItemToString;

  convertValueToItem?: typeof utils.convertValueToItem;

  onInputValueChangeFactory?: (
    setItems: React.Dispatch<React.SetStateAction<Option[]>>,
  ) => ({ inputValue }: { inputValue: string }) => void;
};

type BaseComboboxProps = InputProps<OptionsProps & CommonProps>;

type AdditionalComboboxProps = BaseComboboxProps & {
  /** Whether the select should allow multiple selections. Is enabled, will be represented as a set of checkboxes, otherwise, radios */
  isMultiple?: boolean;
};

export type ComboboxProps = InputProps<AdditionalComboboxProps>;
