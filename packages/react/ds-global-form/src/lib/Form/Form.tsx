import type React from "react";
import { FormProvider, useForm } from "react-hook-form";
import type { FormProps } from "./types.js";

const componentCssClassName = "ds form";

const Form = ({
  id,
  className,
  style,
  children,
  onSubmit,
  methods: externalMethods,
  defaultValues,
  mode,
}: FormProps): React.ReactElement => {
  const internalMethods = useForm({ defaultValues, mode });
  const methods = externalMethods ?? internalMethods;

  return (
    <FormProvider {...methods}>
      <form
        id={id}
        className={[componentCssClassName, className].filter(Boolean).join(" ")}
        style={style}
        onSubmit={methods.handleSubmit(onSubmit)}
      >
        {children}
      </form>
    </FormProvider>
  );
};

export default Form;
