/* @canonical/generator-ds 0.10.0-experimental.2 */

import type { Meta, StoryObj } from "@storybook/react-vite";
import { BadgeSeverities } from "./Badge.Appearance.stories.js";
import Component from "./Badge.js";

const meta = {
  title: "Badge",
  component: Component,
  parameters: {
    docs: {
      description: {
        component:
          "A Badge component for displaying positive numeric values. Numbers are truncated by applying unit suffixes to keep the badge value compact.",
      },
    },
  },
  argTypes: {
    value: {
      control: { type: "number" },
    },
    appearance: {
      options: BadgeSeverities,
      control: { type: "select" },
    },
  },
} satisfies Meta<typeof Component>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    value: 1500,
  },
};

export const Units: Story = {
  args: {
    value: 25001,
    humanizeOptions: { units: [] },
  },
  parameters: {
    docs: {
      description: {
        story:
          "By default, the badge applies metric, 1000-based unit suffixes (k, M, B, T) to truncate values. This can be disabled by providing an empty array to the `units` option, causing the badge to display values up to `magnitudeBase - 1` and then truncate with the overflow indicator.",
      },
    },
  },
};

export const WithCustomStyling: Story = {
  args: {
    value: 123,
    className: "custom-badge",
    style: { backgroundColor: "#f0f0f0", color: "#333" },
  },
  parameters: {
    docs: {
      description: {
        story:
          "The custom styling variant demonstrates how to override the default Badge appearance using CSS classes and inline styles. This variant is perfect for scenarios where you need to match specific design requirements, integrate with existing design systems, or create branded variations. The custom styling is applied in addition to the base Badge styles, allowing for flexible customization while maintaining the component's core functionality.",
      },
    },
  },
};

export const WithCustomPluralization: Story = {
  args: {
    value: 15,
    pluralizeOptions: { singular: "box", plural: "boxes" },
  },
  parameters: {
    docs: {
      description: {
        story:
          "<p>" +
          'The badge uses a <code>title</code> prop to show more context (ex: "15 servers" instead of just "15") about the badge contents on hover. ' +
          "</p>" +
          "<p>" +
          "By default, the item is pluralized by adding an 's' suffix to the singular form \"item\". " +
          "</p>" +
          "<p>" +
          "Custom <code>itemOptions</code> allow for fine-tuning of number unit formatting. " +
          "For example, you can specify singular and plural forms of a unit to ensure grammatical correctness when displaying counts. " +
          "</p>" +
          "<p>" +
          "In this example, 'box' is used for singular (1 box) and 'boxes' for plural (2 boxes). This is particularly useful in applications where the Badge represents quantities of specific items." +
          "</p>",
      },
    },
  },
};

export const CustomBase: Story = {
  args: {
    value: 2048,
    humanizeOptions: {
      magnitudeBase: 1024,
      units: ["B", "KiB", "MiB", "GiB"],
    },
  },
  parameters: {
    docs: {
      description: {
        story:
          "Custom units and magnitude base allow for specialized formatting. This example uses binary units (1024-based) commonly used for file sizes and memory.",
      },
    },
  },
};
