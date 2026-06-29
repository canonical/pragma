import type { RegisterOptions } from "react-hook-form";
import removePhoneMask from "./removePhoneMask.js";

/**
 * react-hook-form `register()` options that strip any phone display mask so the
 * registered/submitted value is always raw digits, regardless of how the input
 * is formatted on screen. Spread into `register(name, phoneRegisterOptions())`,
 * or merge with your own rules.
 *
 * @example
 *   <input {...register("phone", phoneRegisterOptions())} />
 *
 * @note Pure.
 */
export default function phoneRegisterOptions(): RegisterOptions {
  return {
    setValueAs: (value: unknown) => removePhoneMask(String(value ?? "")),
  };
}
