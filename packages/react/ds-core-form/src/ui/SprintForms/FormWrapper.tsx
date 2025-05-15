import React, { useState } from "react";
import type { ReactNode } from "react";
import { FormProvider, useForm } from "react-hook-form";

/**
 * Wraps a child inside a FormProvider and a form element
 */
const FormWrapper = ({ children }: { children: ReactNode }) => {
  const defaultValues = {
    name: "John",
    age: 35,
    country: "USA",
    comments: "",
  };

  // Call React Hook Forms to get the form methods (get values, submit, etc.)
  const methods = useForm({
    mode: "onChange",
    defaultValues,
  });

  // For debugging output, so you can see the submitted form state
  const [formValues, setFormValues] = useState({});
  const onSubmit = (data: Record<string, unknown>) => {
    setFormValues(data);
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)}>{children}</form>
      <br />
      {formValues && JSON.stringify(formValues)}
    </FormProvider>
  );
};

export default FormWrapper;
