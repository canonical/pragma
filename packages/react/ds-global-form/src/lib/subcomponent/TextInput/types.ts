import type { ComponentProps, ReactNode } from "react";
import type { NativeInputType } from "../types.js";

/** Native text-like input types rendered by the Text input. */
export type TextInputType = NativeInputType;

type OwnProps = {
  /** The type of the underlying native input. Defaults to `text`. */
  inputType?: TextInputType;

  /** Prefix element, rendered inside `span.prefix`. */
  prefix?: ReactNode;

  /** Suffix element, rendered inside `span.suffix`. */
  suffix?: ReactNode;
};

/**
 * Props for the presentational Text input (no react-hook-form).
 *
 * The rendered root is a presentational `<div class="ds input text chrome">`
 * that only exists to position the optional prefix/suffix slots; the component's
 * native props are the inner `<input>`'s — the labelable, registered control
 * every attribute is spread onto. `id`, `className` and `style` are applied to
 * the chrome wrapper instead.
 */
export type TextInputProps = OwnProps &
  Omit<ComponentProps<"input">, keyof OwnProps>;
