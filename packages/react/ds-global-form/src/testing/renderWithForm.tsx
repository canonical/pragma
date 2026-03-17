import { type RenderOptions, render } from "@testing-library/react";
import type React from "react";
import { FormProvider, type UseFormProps, useForm } from "react-hook-form";

function TestForm({
  children,
  formProps,
}: {
  children: React.ReactNode;
  formProps?: UseFormProps;
}) {
  const methods = useForm(formProps);
  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(() => {})}>{children}</form>
    </FormProvider>
  );
}

export function renderWithForm(
  ui: React.ReactElement,
  options?: {
    formProps?: UseFormProps;
    renderOptions?: Omit<RenderOptions, "wrapper">;
  },
) {
  return render(ui, {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <TestForm formProps={options?.formProps}>{children}</TestForm>
    ),
    ...options?.renderOptions,
  });
}
