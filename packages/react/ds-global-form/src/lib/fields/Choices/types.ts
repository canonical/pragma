import type React from "react";
import type { BaseProps } from "#lib/subcomponent/types.js";
import type { InputProps } from "../types.js";

export type ChoiceOption = {
  value: string;
  /** Freely-shaped label content (text, card, icon, etc.) */
  label: React.ReactNode;
  disabled?: boolean;
};

type AdditionalChoicesProps = {
  /** Field name shared by every option input in the group */
  name: string;

  /** Choice options with ReactNode labels */
  options: ChoiceOption[];

  /** Multiple selection (checkboxes) vs single (radios) */
  isMultiple?: boolean;

  /** Whether all options are disabled */
  disabled?: boolean;

  /** Selected value (string for radios, string[] for checkboxes) */
  value?: string | string[];

  /** Called with the next selected value when an option is toggled */
  onChange?: (value: string | string[]) => void;
};

/** Props for the presentational Choices (controlled, no react-hook-form). */
export type ChoicesPresentationProps = BaseProps & AdditionalChoicesProps;

/** Props for the react-hook-form-bound Choices field. */
export type ChoicesProps = InputProps<ChoicesPresentationProps>;
