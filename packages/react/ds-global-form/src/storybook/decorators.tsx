import type React from "react";
import { FormProvider, useForm } from "react-hook-form";

interface FormDecoratorParams {
  defaultValues?: Record<string, unknown>;
}

export const form = ({ defaultValues = {} }: FormDecoratorParams = {}) => {
  return (Story: React.ElementType) => {
    const FormWrapper: React.ElementType = () => {
      const methods = useForm({
        mode: "onChange",
        defaultValues,
      });

      const onSubmit = (data: Record<string, unknown>) => {
        console.log("[FORM SUBMIT]", data);
      };

      return (
        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(onSubmit)}>
            <Story />
            <br />
            <input type="submit" value="Print in console" />
          </form>
        </FormProvider>
      );
    };

    return <FormWrapper />;
  };
};
