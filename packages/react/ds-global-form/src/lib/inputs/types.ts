import type React from "react";

// Shared presentational input types (no react-hook-form). The field tier
// (`fields/types.ts`) re-exports these and layers the RHF/binding types on top.

export type BaseProps = {
  id?: string;
  className?: string;
  style?: React.CSSProperties;
};

/** A selectable option for choice-style inputs (Select, Combobox, Choices…). */
export type Option = {
  value: string;
  label: string;
  disabled?: boolean;
};

export type OptionsProps = {
  options: Option[];
};

/** Native text-like input types associated with a text input. */
export type TODONativeInputTypes =
  | "text"
  | "password"
  | "email"
  | "number"
  | "tel"
  | "url";
