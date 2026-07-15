import type { Meta, StoryObj } from "@storybook/react-vite";
import { FORM_DEFAULT_VALUES } from "data/index.js";
import { FormProvider, useForm } from "react-hook-form";
import Component from "./Showcase.js";

const meta = {
  title: "Showcase",
  component: Component,
  decorators: (Story) => {
    const methods = useForm({
      mode: "onChange",
      defaultValues: FORM_DEFAULT_VALUES,
    });

    return (
      <FormProvider {...methods}>
        <form id="form-root">{Story()}</form>
      </FormProvider>
    );
  },
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof Component>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
