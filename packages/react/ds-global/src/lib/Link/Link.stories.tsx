/* @canonical/generator-ds 0.10.0-experimental.2 */

import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import Component from "./Link.js";

const meta = {
  title: "Experimental/Link",
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

// A fake router link component for demonstration purposes
const FakeRouterLink = ({ ...props }: { children: ReactNode }) => (
  <a {...props}>{props.children}</a>
);

export const AsPolymorphicComponent: Story = {
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
          "The `<Link>` component can be rendered as any component. This is useful for using the styling of our `Link` component with the functionality of other components, such as routing frameworks' `<Link>` elements.<br><br>To apply link styling to other components, pass a React element name string or a custom component to the `as` prop.",
      },
      source: {
        code: `
// Example with a fictional RouterLink from a routing library
import { Link } from '@canonical/react-ds-global';
import { RouterLink } from 'your-router-library';

<Link
  as={RouterLink}
  to="/download/desktop"
>
  Download Ubuntu Desktop
</Link>
        `,
      },
    },
  },
};
