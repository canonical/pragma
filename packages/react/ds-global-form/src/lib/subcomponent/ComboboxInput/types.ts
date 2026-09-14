/* @canonical/generator-ds 0.9.0-experimental.9 */
import type { ComponentProps, Dispatch, SetStateAction } from "react";
import type { Option, OptionsProps } from "../types.js";
import type * as utils from "./utils/index.js";

type OwnProps = OptionsProps & {
  /** Controlled value — supplied by the field tier, or directly when standalone. */
  value?: string | string[];

  onChange?: (value: string | string[] | undefined) => void;

  onBlur?: () => void;

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
    setItems: Dispatch<SetStateAction<Option[]>>,
  ) => ({ inputValue }: { inputValue: string }) => void;
};

/** Props for the presentational Combobox (controlled, no react-hook-form).
 * Renders a `<div class="ds combobox form-combobox">` as its root. */
export type ComboboxInputProps = OwnProps &
  Omit<ComponentProps<"div">, keyof OwnProps>;
