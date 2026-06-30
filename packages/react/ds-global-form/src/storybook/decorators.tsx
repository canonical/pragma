import { useFormStateEmitter } from "@canonical/storybook-addon-form-state";
import type React from "react";
import { useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";

const formCssClassName = "ds form";

interface FormDecoratorParams {
  defaultValues?: Record<string, unknown>;
  touchedFields?: string[];
  /** Extra class name(s) for the form element (e.g. "form-layout-side") */
  className?: string;
}

export const form = ({
  defaultValues = {},
  touchedFields = [],
  className,
}: FormDecoratorParams = {}) => {
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
          methods.setValue(field, methods.getValues(field), {
            shouldTouch: true,
          });
        }
      }, [methods]);

      return (
        <FormProvider {...methods}>
          <form
            className={[formCssClassName, "subgrid", className]
              .filter(Boolean)
              .join(" ")}
            onSubmit={methods.handleSubmit(() => {})}
          >
            <Story />
          </form>
        </FormProvider>
      );
    };

    return <FormWrapper />;
  };
};

/**
 * Wraps a story in a `.grid.responsive` context (the design-system 4/8/12-column
 * responsive grid). A `.ds.form` is a `subgrid`, so it only resolves real column
 * tracks when nested in a parent `.grid` — column-based field layouts (e.g.
 * SimpleChoicesField's "columns", ChoicesField's `--choices-span`) need this to
 * demonstrate correctly. Compose after `form()`: `[grid(), form()]`.
 */
export const grid =
  () =>
  (Story: React.ElementType): React.ReactElement => (
    <div className="grid responsive">
      <Story />
    </div>
  );
