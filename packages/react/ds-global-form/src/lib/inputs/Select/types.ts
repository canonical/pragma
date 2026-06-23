import type React from "react";
import type { OptionsProps } from "../types.js";

type NativeSelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

/** Props for the presentational Select input (no react-hook-form). */
export type SelectPresentationProps = NativeSelectProps & OptionsProps;
