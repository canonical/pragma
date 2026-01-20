import type { Meta, StoryObj } from "@storybook/react-vite";
import Component from "./Label.js";
import Label from "./Label.js";

const meta = {
  title: "Global/Label",
  component: Component,
  tags: ["autodocs"],
  argTypes: {
    criticality: {
      control: "select",
      options: [undefined, "info", "success", "warning", "critical"],
    },
  },
} satisfies Meta<typeof Component>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default label without any criticality modifier.
 */
export const Default: Story = {
  args: {
    children: "Label",
  },
};

/**
 * Info label for informational messages.
 */
export const Info: Story = {
  args: {
    children: "Info",
    criticality: "info",
  },
};

/**
 * Success label for positive outcomes.
 */
export const Success: Story = {
  args: {
    children: "Success",
    criticality: "success",
  },
};

/**
 * Warning label for cautionary messages.
 */
export const Warning: Story = {
  args: {
    children: "Warning",
    criticality: "warning",
  },
};

/**
 * Critical label for error states or urgent messages.
 */
export const Critical: Story = {
  args: {
    children: "Critical",
    criticality: "critical",
  },
};

/**
 * All criticality variants displayed together.
 */
export const AllVariants: Story = {
  decorators: [
    () => (
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        <Label>Default</Label>
        <Label criticality="info">Info</Label>
        <Label criticality="success">Success</Label>
        <Label criticality="warning">Warning</Label>
        <Label criticality="critical">Critical</Label>
      </div>
    ),
  ],
  args: {
    children: "Placeholder",
  },
};
