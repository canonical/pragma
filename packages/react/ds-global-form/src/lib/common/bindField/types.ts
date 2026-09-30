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
   * Extra `register()` options merged UNDER the consumer's `registerProps` (the
   * consumer always wins on conflict). Accepts either:
   *
   * - a **static** `RegisterOptions` object — for input-type defaults that don't
   *   depend on props, e.g. Number's `{ valueAsNumber: true }`; or
   * - a **function of the component's own props** `(props) => RegisterOptions` —
   *   for prop-driven rules, e.g. a Date field turning its `min`/`max` props into
   *   RHF min/max rules, or a FileUpload field turning `maxFiles`/`maxSize` into a
   *   `validate` rule. Runs at render with the live props.
   *
   * The props are still forwarded to the input, so native constraints (picker,
   * spinner, `accept`) are unaffected — this only adds the RHF-visible rules that
   * surface an inline field error.
   */
  additionalRegisterProps?:
    | RegisterOptions
    | ((props: Record<string, unknown>) => RegisterOptions);
}

export type FieldBindingProps = {
  name: string;
  registerProps?: RegisterOptions;
};
