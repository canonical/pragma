import { useEffect } from "react";
import type React from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useFormStateEmitter } from "@canonical/storybook-addon-form-state";

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

      useFormStateEmitter(methods);

      // react-hook-form has no `defaultTouched` in UseFormProps.
      // setValue with shouldTouch is the idiomatic workaround.
      // https://github.com/react-hook-form/react-hook-form/issues/1418
      useEffect(() => {
        for (const field of touchedFields) {
          methods.setValue(field, methods.getValues(field), { shouldTouch: true });
        }
      }, [methods]);

      return (
        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(() => {})}>
            <Story />
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
