import { useEffect } from "react";
import type React from "react";
import { FormProvider, useForm } from "react-hook-form";

interface FormDecoratorParams {
  defaultValues?: Record<string, unknown>;
  touchedFields?: string[];
}

export const form = ({ defaultValues = {}, touchedFields = [] }: FormDecoratorParams = {}) => {
  return (Story: React.ElementType) => {
    const FormWrapper: React.ElementType = () => {
      const methods = useForm({
        mode: "onChange",
        defaultValues,
      });

      // react-hook-form has no `defaultTouched` in UseFormProps.
      // setValue with shouldTouch is the idiomatic workaround.
      // https://github.com/react-hook-form/react-hook-form/issues/1418
      useEffect(() => {
        for (const field of touchedFields) {
          methods.setValue(field, methods.getValues(field), { shouldTouch: true });
        }
      }, [methods]);

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

export const grid = () => {
  return (Story: React.ElementType, context: { globals?: { grid?: string } }) => {
    const modifier = context.globals?.grid ?? "intrinsic";
    return (
      <div className={`grid ${modifier}`}>
        <Story />
      </div>
    );
  };
};
