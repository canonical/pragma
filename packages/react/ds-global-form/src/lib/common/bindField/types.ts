import type { RegisterOptions } from "react-hook-form";

export type BindMode = "native" | "controlled";

export interface BindFieldOptions {
  /**
   * Inject the live field value as a `value` prop on the presentational input.
   * Needed by inputs that render their own value (e.g. Range's `<output>`).
   */
  injectValue?: boolean;
  /**
   * Default value for the registered field (controlled mode only). Preserves the
   * registration default that some inputs set in `useController` (e.g. Color
   * `"#000000"`, FileUpload `[]`).
   */
  defaultValue?: unknown;
  /**
   * Base `register()` options merged UNDER the consumer's `registerProps` (the
   * consumer wins on conflict). Lets a field set input-type defaults — e.g.
   * Number passing `{ valueAsNumber: true }` so RHF stores a number, not the
   * string the native `<input type="number">` reports.
   */
  registerDefaults?: RegisterOptions;
}

export type FieldBindingProps = {
  name: string;
  registerProps?: RegisterOptions;
};
