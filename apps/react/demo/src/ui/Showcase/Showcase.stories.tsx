import type { Meta, StoryObj } from "@storybook/react";
import { useExampleRHFInterface } from "hooks/index.js";
import { FormProvider } from "react-hook-form";
import Component from "./Showcase.js";

const meta = {
  title: "Showcase",
  component: Component,
  decorators: (Story) => {
    const { methods } = useExampleRHFInterface();

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
