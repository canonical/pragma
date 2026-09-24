// Shared presentational input types (no react-hook-form). The field tier
// (`fields/types.ts`) re-exports these and layers the RHF/binding types on top.
//
// There is deliberately no shared "base props" type here. A component's props
// extend the native props of the element it renders as its root
// (`ComponentProps<"tag">`), which each component declares for itself — a
// hand-picked common subset would freeze every input at the same three
// attributes.

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
export type NativeInputType =
  | "text"
  | "password"
  | "email"
  | "number"
  | "tel"
  | "url";
