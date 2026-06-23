import type React from "react";
import type { NativeInputType } from "../types.js";

/** Native text-like input types rendered by the Text input. */
export type TextInputType = NativeInputType;

type NativeTextProps = React.InputHTMLAttributes<HTMLInputElement>;

type AdditionalTextProps = {
  /** The type of the underlying native input. Defaults to `text`. */
  inputType?: TextInputType;

  /** Prefix element, rendered inside `span.prefix`. */
  prefix?: React.ReactNode;

  /** Suffix element, rendered inside `span.suffix`. */
  suffix?: React.ReactNode;
};

/** Props for the presentational Text input (no react-hook-form). */
export type TextPresentationProps = NativeTextProps & AdditionalTextProps;
