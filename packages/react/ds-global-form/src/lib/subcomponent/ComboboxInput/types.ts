/* @canonical/generator-ds 0.9.0-experimental.9 */
import type { BaseProps, Option, OptionsProps } from "../types.js";
import type * as utils from "./utils/index.js";

/** Controlled value props — supplied by the field tier, or directly when standalone. */
type ControlledProps = {
  value?: string | string[];
  onChange?: (value: string | string[] | undefined) => void;
  onBlur?: () => void;
};

type CommonProps = {
  /** Whether the input is disabled */
  disabled?: boolean;

  placeholder?: string;

  valueKey?: keyof Option;

  openOnReset?: boolean;

  /** When enabled, allows selecting multiple values (rendered as chips). */
  isMultiple?: boolean;

  filterItems?: (options: Option[], inputValue: string) => Option[];

  convertItemToString?: typeof utils.convertItemToString;

  convertValueToItem?: typeof utils.convertValueToItem;

  onInputValueChangeFactory?: (
    setItems: React.Dispatch<React.SetStateAction<Option[]>>,
  ) => ({ inputValue }: { inputValue: string }) => void;
};

/** Props for the presentational Combobox (controlled, no react-hook-form). */
export type ComboboxInputProps = BaseProps &
  OptionsProps &
  CommonProps &
  ControlledProps;
