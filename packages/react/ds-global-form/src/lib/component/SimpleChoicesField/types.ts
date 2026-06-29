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

  /** Layout: "inline" wraps options horizontally, "stacked" puts each on its own line */
  layout?: "inline" | "stacked";

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
