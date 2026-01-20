import type { Meta, StoryObj } from "@storybook/react-vite";
import Component from "./Breadcrumbs.js";
import Breadcrumbs from "./Breadcrumbs.js";

const meta = {
  title: "Global/Breadcrumbs",
  component: Component,
  tags: ["autodocs"],
} satisfies Meta<typeof Component>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default breadcrumbs with three levels of navigation.
 */
export const Default: Story = {
  args: {
    children: [
      <Breadcrumbs.Item key="home" href="/">
        Home
      </Breadcrumbs.Item>,
      <Breadcrumbs.Item key="products" href="/products">
        Products
      </Breadcrumbs.Item>,
      <Breadcrumbs.Item key="details" current>
        Product Details
      </Breadcrumbs.Item>,
    ],
  },
};

/**
 * Breadcrumbs with only two levels.
 */
export const TwoLevels: Story = {
  args: {
    children: [
      <Breadcrumbs.Item key="home" href="/">
        Home
      </Breadcrumbs.Item>,
      <Breadcrumbs.Item key="about" current>
        About
      </Breadcrumbs.Item>,
    ],
  },
};

/**
 * Breadcrumbs with deep navigation hierarchy.
 */
export const ManyLevels: Story = {
  args: {
    children: [
      <Breadcrumbs.Item key="home" href="/">
        Home
      </Breadcrumbs.Item>,
      <Breadcrumbs.Item key="products" href="/products">
        Products
      </Breadcrumbs.Item>,
      <Breadcrumbs.Item key="electronics" href="/products/electronics">
        Electronics
      </Breadcrumbs.Item>,
      <Breadcrumbs.Item key="phones" href="/products/electronics/phones">
        Phones
      </Breadcrumbs.Item>,
      <Breadcrumbs.Item key="iphone" current>
        iPhone 15
      </Breadcrumbs.Item>,
    ],
  },
};

/**
 * Breadcrumbs using a custom separator character.
 */
export const CustomSeparator: Story = {
  args: {
    children: [
      <Breadcrumbs.Item key="home" href="/" separator="›">
        Home
      </Breadcrumbs.Item>,
      <Breadcrumbs.Item key="products" href="/products" separator="›">
        Products
      </Breadcrumbs.Item>,
      <Breadcrumbs.Item key="details" current separator="›">
        Details
      </Breadcrumbs.Item>,
    ],
  },
};

/**
 * Breadcrumbs with custom aria-label for accessibility.
 */
export const WithCustomAriaLabel: Story = {
  args: {
    "aria-label": "You are here",
    children: [
      <Breadcrumbs.Item key="home" href="/">
        Home
      </Breadcrumbs.Item>,
      <Breadcrumbs.Item key="settings" current>
        Settings
      </Breadcrumbs.Item>,
    ],
  },
};
