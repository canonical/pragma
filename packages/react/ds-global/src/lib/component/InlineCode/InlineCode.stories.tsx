import type { Meta, StoryObj } from "@storybook/react-vite";
import Component from "./InlineCode.js";

const meta: Meta<typeof Component> = {
  title: "components/InlineCode",
  component: Component,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Component>;

export const Default: Story = {
  args: {
    children: "npm install @canonical/react-ds-global",
  },
};

export const WithinText: Story = {
  render: () => (
    <p className="p">
      Install the Ubuntu snap with <Component>snap install juju</Component>,
      then bootstrap a controller by running{" "}
      <Component>juju bootstrap</Component> against your cloud of choice.
      Configuration lives in <Component>~/.local/share/juju</Component> by
      default.
    </p>
  ),
};
