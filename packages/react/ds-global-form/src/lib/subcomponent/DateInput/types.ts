import type React from "react";

// NOTE: kept as `*PresentationProps` (not renamed to `*InputProps` per CS.NAMING.1)
// because `fields/Date/types.ts` already defines a field-tier `DateInputProps`;
// the subcomponent-props rename for the Date trio is deferred to Stage 3d, where the
// field props become `*FieldProps` and the collision is resolved.

type NativeDateInputProps = React.InputHTMLAttributes<HTMLInputElement>;

type AdditionalDateProps = {
  /** Minimum date value (YYYY-MM-DD format) */
  min?: string;

  /** Maximum date value (YYYY-MM-DD format) */
  max?: string;
};

/** Props for the presentational date input (no react-hook-form). */
export type DateInputPresentationProps = NativeDateInputProps &
  AdditionalDateProps;
