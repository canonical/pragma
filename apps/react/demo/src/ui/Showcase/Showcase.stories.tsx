import type { Meta, StoryObj } from "@storybook/react";
import { FormProvider } from "react-hook-form";
import { useGlobalForm } from "../../hooks/index.js";
import Component from "./Showcase.js";

const meta = {
  title: "Showcase",
  component: Component,
  decorators: (Story) => {
    const { methods } = useGlobalForm();

    return (
      <FormProvider {...methods}>
        <form>{Story()}</form>
      </FormProvider>
    );
  },
} satisfies Meta<typeof Component>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
