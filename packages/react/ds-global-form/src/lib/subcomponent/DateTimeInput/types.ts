import type React from "react";

// NOTE: kept as `*PresentationProps` (not renamed to `*InputProps` per CS.NAMING.1)
// because `fields/Date/types.ts` already defines a field-tier `DateTimeInputProps`;
// the subcomponent-props rename for the Date trio is deferred to Stage 3d, where the
// field props become `*FieldProps` and the collision is resolved.

type NativeDateInputProps = React.InputHTMLAttributes<HTMLInputElement>;

type AdditionalDateTimeProps = {
  /** Minimum datetime value (YYYY-MM-DDTHH:MM format) */
  min?: string;

  /** Maximum datetime value (YYYY-MM-DDTHH:MM format) */
  max?: string;

  /** Step interval in seconds */
  step?: number;
};

/** Props for the presentational datetime-local input (no react-hook-form). */
export type DateTimeInputPresentationProps = NativeDateInputProps &
  AdditionalDateTimeProps;
