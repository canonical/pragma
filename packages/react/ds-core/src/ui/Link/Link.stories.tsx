/* @canonical/generator-ds 0.10.0-experimental.2 */

import type { Meta, StoryFn, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { Button } from "../Button/index.js";
import Component from "./Link.js";

const meta = {
  title: "Link",
  component: Component,
  tags: ["autodocs"],
  argTypes: {
    children: {
      control: { type: "text" },
      description: "Content to display in the link.",
    },
    href: {
      control: { type: "text" },
      description: "Link URL",
    },
    appearance: {
      options: ["neutral", "soft"],
      control: { type: "radio" },
      description: "Link appearance modifier.",
    },
    activationContents: {
      control: { type: "text" },
      description: "Content to show on hover/focus.",
    },
    className: {
      control: { type: "text" },
      description: "Additional CSS classes.",
    },
    as: {
      control: { type: "text" },
      description:
        "Element type to render as. This could be a tag name (string), or it could be a component type (function/class).<br><br>Use this to use our link component's styling with the functionality of other components, such as routing frameworks `<Link>` elements. ",
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          "The `Link` component is used to create links to other pages or resources.",
      },
    },
  },
} satisfies Meta<typeof Component>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "Visit Ubuntu",
    href: "https://ubuntu.com",
  },
};

export const Soft: Story = {
  args: {
    children: "Soft link",
    href: "https://ubuntu.com",
    appearance: "soft",
  },
  parameters: {
    docs: {
      description: {
        story: "Soft links appear like default text until interacted with.",
      },
    },
  },
};

export const WithActivationContents: Story = {
  args: {
    children: "Learn more",
    href: "https://ubuntu.com",
    activationContents: "→",
  },
  parameters: {
    docs: {
      description: {
        story:
          "Content in `activationContents` will be shown after the link when it is interacted with. This is useful for showing further context about a link interaction only upon hover/focus etc.",
      },
    },
  },
};

const FakeRouterLink = ({ ...props }: { children: ReactNode }) => (
  <a {...props}>{props.children}</a>
);

export const AsCustomComponent: Story = {
  args: {
    as: FakeRouterLink,
    children: "Download Ubuntu Desktop",
    href: "https://ubuntu.com/download/desktop",
    target: "_blank",
  },
  parameters: {
    docs: {
      description: {
        story:
          "The `Link` component can be rendered as any component. Here we use our `Button` component to create a link that looks like a button.",
      },
    },
  },
};
