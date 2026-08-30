import type { RegisterOptions } from "react-hook-form";
import type { Formatter } from "./types.js";

/**
 * Build react-hook-form `register()` options that normalise a formatted display
 * value back to its model form, so the registered value is whatever the
 * formatter's `parse` yields regardless of how the input is decorated on screen.
 * Spread into `register(name, createFormatterRegisterOptions(formatter))`, or
 * merge with your own rules.
 *
 * This covers the `register()` path only. react-hook-form does not apply
 * `setValueAs` to a field bound with `useController`, so a controlled input must
 * normalise in its own change handler instead — as PhoneInput does.
 *
 * @example
 *   <input {...register("phone", createFormatterRegisterOptions(formatter))} />
 *
 * @note Pure.
 */
export default function createFormatterRegisterOptions(
  formatter: Formatter,
): RegisterOptions {
  return {
    setValueAs: (value: unknown) => formatter.parse(String(value ?? "")),
  };
}
