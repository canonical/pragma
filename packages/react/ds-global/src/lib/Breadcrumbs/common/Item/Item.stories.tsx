import type { Meta, StoryObj } from "@storybook/react-vite";
import Component from "./Item.js";

const meta = {
  title: "A/Breadcrumbs/Item",
  component: Component,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "A single breadcrumb item with link and separator. Renders as a link by default, or as text when `current` or `disabled` is true. Implements `ds:global.subcomponent.breadcrumbs-item`.",
      },
    },
  },
  argTypes: {
    label: {
      control: { type: "text" },
      description: "The link text label.",
    },
    url: {
      control: { type: "text" },
      description: "The URL to navigate to when clicked.",
    },
    current: {
      control: { type: "boolean" },
      description:
        "Whether this is the current/active breadcrumb. Renders as text instead of link.",
    },
    disabled: {
      control: { type: "boolean" },
      description:
        "Whether the breadcrumb is disabled. Renders as text instead of link.",
    },
    separator: {
      control: { type: "text" },
      description: "Custom separator character or element.",
    },
  },
  decorators: [
    (Story) => (
      <nav aria-label="Breadcrumb">
        <ol
          className="ds breadcrumbs"
          style={{
            display: "flex",
            listStyle: "none",
            padding: 0,
            margin: 0,
            gap: "0.5rem",
          }}
        >
          <Story />
        </ol>
      </nav>
    ),
  ],
} satisfies Meta<typeof Component>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default breadcrumb item with link.
 */
export const Default: Story = {
  args: {
    label: "Products",
    url: "/products",
  },
};

/**
 * Current/active breadcrumb item (renders as text, not link).
 */
export const Current: Story = {
  args: {
    label: "Product Details",
    current: true,
  },
};

/**
 * Disabled breadcrumb item.
 */
export const Disabled: Story = {
  args: {
    label: "Unavailable Section",
    url: "/unavailable",
    disabled: true,
  },
};

/**
 * Breadcrumb item with custom separator.
 */
export const CustomSeparator: Story = {
  args: {
    label: "Documentation",
    url: "/docs",
    separator: "›",
  },
};

/**
 * Breadcrumb item using children instead of label.
 */
export const WithChildren: Story = {
  args: {
    url: "/",
    children: (
      <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
        <span aria-hidden="true">🏠</span>
        Home
      </span>
    ),
  },
};
