import type { Meta, StoryObj } from "@storybook/react-vite";
import * as decorators from "storybook/decorators.js";
import { HiddenField } from "./index.js";

const meta = {
  title: "Fields/Hidden",
  component: HiddenField,
  tags: ["autodocs"],
  decorators: [
    decorators.form({ defaultValues: { hidden_field: "hidden_value" } }),
  ],
  parameters: { chromatic: { disableSnapshot: true } },
} satisfies Meta<typeof HiddenField>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { name: "hidden_field" } };
