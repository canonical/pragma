import type React from "react";
import { FormProvider, useForm } from "react-hook-form";
import type { FormProps } from "./types.js";

const componentCssClassName = "ds form";

/**
 * Renders the shared form markup wrapped in a FormProvider.
 */
function FormShell({
  id,
  className,
  style,
  children,
  onSubmit,
  methods,
}: Omit<FormProps, "defaultValues" | "mode"> & {
  methods: NonNullable<FormProps["methods"]>;
}): React.ReactElement {
  return (
    <FormProvider {...methods}>
      <form
        id={id}
        className={[componentCssClassName, "subgrid", className]
          .filter(Boolean)
          .join(" ")}
        style={style}
        onSubmit={methods.handleSubmit(onSubmit)}
      >
        {children}
      </form>
    </FormProvider>
  );
}

/**
 * Uses the caller-provided `methods` directly — no `useForm` call.
 */
function ExternalForm({
  methods,
  ...rest
}: FormProps & {
  methods: NonNullable<FormProps["methods"]>;
}): React.ReactElement {
  return <FormShell {...rest} methods={methods} />;
}

/**
 * Creates its own `useForm` instance from `defaultValues` / `mode`.
 */
function InternalForm({
  defaultValues,
  mode,
  ...rest
}: Omit<FormProps, "methods">): React.ReactElement {
  const methods = useForm({ defaultValues, mode });
  return <FormShell {...rest} methods={methods} />;
}

/**
 * Public Form component that routes to the appropriate implementation
 * depending on whether external `methods` are provided.
 */
const Form = ({
  methods,
  defaultValues,
  mode,
  ...rest
}: FormProps): React.ReactElement => {
  if (methods) {
    return <ExternalForm {...rest} methods={methods} />;
  }
  return <InternalForm {...rest} defaultValues={defaultValues} mode={mode} />;
};

export default Form;
