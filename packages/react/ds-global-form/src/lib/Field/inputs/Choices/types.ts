import type React from "react";
import type { FieldValues, UseFormRegister } from "react-hook-form";
import type { InputProps } from "../../types.js";

export type ChoiceOption = {
  value: string;
  /** Freely-shaped label content (text, card, icon, etc.) */
  label: React.ReactNode;
  disabled?: boolean;
};

export type ChoiceOptionProps = {
  name: string;
  type: string;
  value: string;
  label: React.ReactNode;
  register: UseFormRegister<FieldValues>;
  registerProps?: Record<string, unknown>;
  disabled: boolean;
};

type AdditionalChoicesProps = {
  /** Choice options with ReactNode labels */
  options: ChoiceOption[];

  /** Multiple selection (checkboxes) vs single (radios) */
  isMultiple?: boolean;

  /** Whether all options are disabled */
  disabled?: boolean;
};

export type ChoicesProps = InputProps<AdditionalChoicesProps>;
