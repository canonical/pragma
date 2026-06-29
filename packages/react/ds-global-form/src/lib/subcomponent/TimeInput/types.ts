import type React from "react";

// NOTE: kept as `*PresentationProps` (not renamed to `*InputProps` per CS.NAMING.1)
// because `fields/Date/types.ts` already defines a field-tier `TimeInputProps`;
// the subcomponent-props rename for the Date trio is deferred to Stage 3d, where the
// field props become `*FieldProps` and the collision is resolved.

type NativeDateInputProps = React.InputHTMLAttributes<HTMLInputElement>;

type AdditionalTimeProps = {
  /** Minimum time value (HH:MM format) */
  min?: string;

  /** Maximum time value (HH:MM format) */
  max?: string;

  /** Step interval in seconds */
  step?: number;
};

/** Props for the presentational time input (no react-hook-form). */
export type TimeInputPresentationProps = NativeDateInputProps &
  AdditionalTimeProps;
