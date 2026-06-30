/* @canonical/generator-ds 0.9.0-experimental.9 */

import type { InputProps } from "#lib/common/types.js";
import type { BaseProps, OptionsProps } from "#lib/subcomponent/types.js";

type AdditionalSimpleChoicesProps = OptionsProps & {
  /** Field name shared by every option input in the group */
  name: string;

  /** Whether the select should allow multiple selections. Is enabled, will be represented as a set of checkboxes, otherwise, radios */
  isMultiple?: boolean;

  /** Whether the input is disabled */
  disabled?: boolean;

  /**
   * Layout of the option group:
   *  - "inline" (default): options wrap horizontally, each as wide as its content
   *  - "stacked": one option per line
   *  - "columns": a grid of equal-width columns (see {@link columns})
   */
  layout?: "inline" | "stacked" | "columns";

  /**
   * Number of equal-width columns when `layout="columns"`. Defaults to 2.
   * Ignored in the other layouts.
   */
  columns?: number;

  /** Selected value (string for radios, string[] for checkboxes) */
  value?: string | string[];

  /** Called with the next selected value when an option is toggled */
  onChange?: (value: string | string[]) => void;
};

/** Props for the presentational SimpleChoices (controlled, no react-hook-form). */
export type SimpleChoicesPresentationProps = BaseProps &
  AdditionalSimpleChoicesProps;

/** Props for the react-hook-form-bound SimpleChoices field. */
export type SimpleChoicesFieldProps =
  InputProps<SimpleChoicesPresentationProps>;
