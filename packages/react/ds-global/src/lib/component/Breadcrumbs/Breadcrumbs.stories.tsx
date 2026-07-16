import type { Meta, StoryObj } from "@storybook/react-vite";
import Component from "./Breadcrumbs.js";
import type { BreadcrumbItem } from "./types.js";

const meta = {
  title: "components/Breadcrumbs",
  component: Component,
} satisfies Meta<typeof Component>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default breadcrumbs with three levels of navigation.
 */
export const Default: Story = {
  args: {
    items: [
      { url: "/", label: "Home" },
      { url: "/products", label: "Products" },
      { key: "details", label: "Product Details", current: true },
    ],
  },
};

/**
 * Breadcrumbs with only two levels.
 */
export const TwoLevels: Story = {
  args: {
    items: [
      { url: "/", label: "Home" },
      { key: "about", label: "About", current: true },
    ],
  },
};

/**
 * Breadcrumbs with deep navigation hierarchy.
 */
export const ManyLevels: Story = {
  args: {
    items: [
      { url: "/", label: "Ubuntu" },
      { url: "/server", label: "Server" },
      { url: "/server/docs", label: "Docs" },
      { url: "/server/docs/installation", label: "Installation" },
      { key: "autoinstall", label: "Autoinstall", current: true },
    ],
  },
};

/**
 * Breadcrumbs wrapping in a constrained container. On overflow each separator
 * wraps together with its following link, so the slash starts the second line
 * (and does not trail the first), with a 4px vertical distance between rows.
 */
export const Overflow: Story = {
  decorators: [
    (Story) => (
      <div style={{ maxWidth: "18rem" }}>
        <Story />
      </div>
    ),
  ],
  args: {
    items: [
      { url: "/", label: "Ubuntu" },
      { url: "/server", label: "Server" },
      { url: "/server/docs", label: "Documentation" },
      { url: "/server/docs/installation", label: "Installation" },
      { url: "/server/docs/installation/advanced", label: "Advanced" },
      { key: "autoinstall", label: "Autoinstall", current: true },
    ],
  },
};

/**
 * Breadcrumbs using a custom separator character.
 *
 * For external (non-Canonical) products only. Not designed or approved for
 * Canonical products; Canonical products must use the default "/" separator.
 */
export const CustomSeparator: Story = {
  args: {
    separator: "›",
    items: [
      { url: "/", label: "Home" },
      { url: "/products", label: "Products" },
      { key: "details", label: "Details", current: true },
    ],
  },
};

/**
 * Breadcrumbs with custom aria-label for accessibility.
 */
export const WithCustomAriaLabel: Story = {
  args: {
    "aria-label": "You are here",
    items: [
      { url: "/", label: "Home" },
      { key: "settings", label: "Settings", current: true },
    ],
  },
};

/**
 * Breadcrumbs with a custom item component.
 * Demonstrates the switch pattern for custom rendering.
 *
 * For external (non-Canonical) products only. Not designed or approved for
 * Canonical products; Canonical products must use the default
 * Breadcrumbs.Item.
 *
 * Custom components must render the separator BEFORE the link so that on
 * wrap the separator starts the new line (it is hidden on the first item
 * via CSS).
 */
const CustomItem = ({
  label,
  url,
  current,
  separator,
}: BreadcrumbItem & { separator?: React.ReactNode }) => (
  <li className="ds breadcrumbs-item custom">
    <span className="separator" aria-hidden="true">
      {separator}
    </span>
    {current ? (
      <strong className="link" aria-current="page">
        {label}
      </strong>
    ) : (
      <a className="link" href={url} style={{ textDecoration: "underline" }}>
        {label}
      </a>
    )}
  </li>
);

/**
 * Breadcrumbs rendering items through a custom per-item Component.
 *
 * For external (non-Canonical) products only. Not designed or approved for
 * Canonical products; Canonical products must use the default
 * Breadcrumbs.Item.
 */
export const WithCustomComponent: Story = {
  args: {
    items: [
      { url: "/", label: "Home", Component: CustomItem },
      { url: "/docs", label: "Documentation", Component: CustomItem },
      {
        key: "api",
        label: "API Reference",
        current: true,
        Component: CustomItem,
      },
    ],
  },
};
