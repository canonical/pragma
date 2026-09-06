import type { ComponentProps } from "react";
import type { OptionsProps } from "../types.js";

/** Props for the presentational Select input (no react-hook-form). Renders a
 * `<select>` as its root. */
export type SelectInputProps = OptionsProps &
  Omit<ComponentProps<"select">, keyof OptionsProps>;
