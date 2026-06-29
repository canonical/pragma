import type React from "react";
import {
  type RegisterOptions,
  useController,
  useFormContext,
  useWatch,
} from "react-hook-form";

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

type FieldBindingProps = {
  name: string;
  registerProps?: RegisterOptions;
};

/**
 * Adapts a presentational input (which knows nothing about react-hook-form)
 * into the field tier by performing the RHF binding. It consumes the
 * `name`/`registerProps` (and aria) props that `Wrapper` already injects, so it
 * does not re-run `useFieldWrapper`.
 *
 * - `native` — spreads `register(name, registerProps)` onto the input
 *   (uncontrolled; preserves RHF's native-input performance path).
 * - `controlled` — lifts `useController` out of the leaf and passes
 *   `value`/`onChange`/`onBlur`/`ref`.
 *
 * The binding mode is resolved once at factory time, so each returned component
 * calls its hooks unconditionally.
 */
export default function bindField<P extends FieldBindingProps>(
  // biome-ignore lint/suspicious/noExplicitAny: presentational prop shapes vary per input
  Presentational: React.ComponentType<any>,
  mode: BindMode,
  options: BindFieldOptions = {},
): React.FC<P> {
  const label =
    (Presentational as { displayName?: string }).displayName ||
    Presentational.name ||
    "Input";

  // Merge the field's register defaults UNDER the consumer's registerProps. Cast
  // once: RHF's RegisterOptions is a discriminated union (e.g. `valueAsNumber`
  // excludes `pattern`), which an object spread cannot satisfy structurally even
  // though the merged value is valid at runtime.
  const mergeRegister = (
    registerProps: RegisterOptions | undefined,
  ): RegisterOptions =>
    ({ ...options.registerDefaults, ...registerProps }) as RegisterOptions;

  let Bound: React.FC<P>;

  if (mode === "controlled") {
    Bound = ({ name, registerProps, ...rest }: P) => {
      const { field } = useController({
        name,
        rules: registerProps,
        ...(options.defaultValue !== undefined
          ? { defaultValue: options.defaultValue }
          : {}),
      });
      return (
        <Presentational
          {...rest}
          name={name}
          value={field.value}
          onChange={field.onChange}
          onBlur={field.onBlur}
          ref={field.ref}
        />
      );
    };
  } else if (options.injectValue) {
    Bound = ({ name, registerProps, ...rest }: P) => {
      const { register } = useFormContext();
      const value = useWatch({ name });
      return (
        <Presentational
          {...rest}
          value={value}
          {...register(name, mergeRegister(registerProps))}
        />
      );
    };
  } else {
    Bound = ({ name, registerProps, ...rest }: P) => {
      const { register } = useFormContext();
      return (
        <Presentational
          {...rest}
          {...register(name, mergeRegister(registerProps))}
        />
      );
    };
  }

  Bound.displayName = `bindField(${label})`;
  return Bound;
}
