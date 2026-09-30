import type React from "react";
import type { InputProps } from "../../common/types.js";
import type { BaseProps } from "../../subcomponent/types.js";

export type RichChoiceOption = {
  value: string;
  /** Freely-shaped label content (text, card, icon, etc.) */
  label: React.ReactNode;
  disabled?: boolean;
};

type AdditionalRichChoicesProps = {
  /** Field name shared by every option input in the group */
  name: string;

  /** Choice options with ReactNode labels */
  options: RichChoiceOption[];

  /** Multiple selection (checkboxes) vs single (radios) */
  isMultiple?: boolean;

  /** Whether all options are disabled */
  disabled?: boolean;

  /** Selected value (string for radios, string[] for checkboxes) */
  value?: string | string[];

  /** Called with the next selected value when an option is toggled */
  onChange?: (value: string | string[]) => void;
};

/** Props for the presentational RichChoices (controlled, no react-hook-form). */
export type RichChoicesPresentationProps = BaseProps &
  AdditionalRichChoicesProps;

/** Props for the react-hook-form-bound RichChoices field. */
export type RichChoicesFieldProps = InputProps<RichChoicesPresentationProps>;
