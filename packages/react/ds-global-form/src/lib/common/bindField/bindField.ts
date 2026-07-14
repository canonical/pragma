import { type ComponentType, createElement, type FC } from "react";
import {
  type RegisterOptions,
  useController,
  useFormContext,
  useWatch,
} from "react-hook-form";
import type { BindFieldOptions, BindMode, FieldBindingProps } from "./types.js";

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
 *
 * @note Authored with `React.createElement` (no JSX) so this is a plain `.ts`
 * module; behaviour is identical to the JSX form.
 */
export default function bindField<P extends FieldBindingProps>(
  // biome-ignore lint/suspicious/noExplicitAny: presentational prop shapes vary per input
  Presentational: ComponentType<any>,
  mode: BindMode,
  options: BindFieldOptions = {},
): FC<P> {
  const label =
    (Presentational as { displayName?: string }).displayName ||
    Presentational.name ||
    "Input";

  // Merge the field's `additionalRegisterProps` UNDER the consumer's
  // registerProps (consumer always wins). `additionalRegisterProps` may be a
  // static object or a function of the component's own props; resolve it per
  // render against `props`. Cast once: RHF's RegisterOptions is a discriminated
  // union (e.g. `valueAsNumber` excludes `pattern`), which an object spread
  // cannot satisfy structurally even though the merged value is valid at runtime.
  const mergeRegister = (
    registerProps: RegisterOptions | undefined,
    props: Record<string, unknown>,
  ): RegisterOptions => {
    const extra =
      typeof options.additionalRegisterProps === "function"
        ? options.additionalRegisterProps(props)
        : options.additionalRegisterProps;
    return { ...extra, ...registerProps } as RegisterOptions;
  };

  let Bound: FC<P>;

  if (mode === "controlled") {
    Bound = ({ name, registerProps, ...rest }: P) => {
      const { field } = useController({
        name,
        rules: mergeRegister(registerProps, rest),
        ...(options.defaultValue !== undefined
          ? { defaultValue: options.defaultValue }
          : {}),
      });
      return createElement(Presentational, {
        ...rest,
        name,
        value: field.value,
        onChange: field.onChange,
        onBlur: field.onBlur,
        ref: field.ref,
      });
    };
  } else if (options.injectValue) {
    Bound = ({ name, registerProps, ...rest }: P) => {
      const { register } = useFormContext();
      const value = useWatch({ name });
      return createElement(Presentational, {
        ...rest,
        value,
        ...register(name, mergeRegister(registerProps, rest)),
      });
    };
  } else {
    Bound = ({ name, registerProps, ...rest }: P) => {
      const { register } = useFormContext();
      return createElement(Presentational, {
        ...rest,
        ...register(name, mergeRegister(registerProps, rest)),
      });
    };
  }

  Bound.displayName = `bindField(${label})`;
  return Bound;
}
