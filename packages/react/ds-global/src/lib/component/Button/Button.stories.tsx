import { MODIFIER_FAMILIES } from "@canonical/ds-types";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Fragment } from "react";
import { fn } from "storybook/test";

import Component from "./Button.js";

const meta = {
  title: "_work_in_progress/component/Button",
  component: Component,
  tags: ["autodocs"],
  argTypes: {
    // Importance is never blank — primary is the default hierarchy.
    importance: {
      control: "select",
      options: [...MODIFIER_FAMILIES.importance],
    },
    anticipation: {
      control: "select",
      options: [undefined, ...MODIFIER_FAMILIES.anticipation],
    },
    variant: {
      control: "select",
      options: [undefined, "link"],
    },
  },
  args: { onClick: fn(), importance: "primary" },
} satisfies Meta<typeof Component>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "Button",
  },
};

/**
 * The full variant matrix: each importance (rows) combined with the neutral
 * base and every anticipation (columns). Importance decides how the colour is
 * applied — primary fills, secondary outlines, tertiary is text — while
 * anticipation (and the neutral base) decides which colour. The two compose
 * orthogonally.
 */
export const Matrix: Story = {
  render: (args) => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `auto repeat(${
          MODIFIER_FAMILIES.anticipation.length + 1
        }, auto)`,
        gap: "0.75rem 1rem",
        alignItems: "center",
        justifyItems: "start",
      }}
    >
      {/* Header row: blank corner + column labels. */}
      <span />
      <span style={{ fontSize: "0.75rem", opacity: 0.6 }}>neutral</span>
      {MODIFIER_FAMILIES.anticipation.map((a) => (
        <span key={a} style={{ fontSize: "0.75rem", opacity: 0.6 }}>
          {a}
        </span>
      ))}

      {/* One row per importance. */}
      {MODIFIER_FAMILIES.importance.map((importance) => (
        <Fragment key={importance}>
          <span style={{ fontSize: "0.75rem", opacity: 0.6 }}>
            {importance}
          </span>
          <Component {...args} importance={importance}>
            Button
          </Component>
          {MODIFIER_FAMILIES.anticipation.map((anticipation) => (
            <Component
              key={anticipation}
              {...args}
              importance={importance}
              anticipation={anticipation}
            >
              Button
            </Component>
          ))}
        </Fragment>
      ))}
    </div>
  ),
  args: { children: "Button" },
};

/**
 * Link variant renders as inline text with underline.
 */
export const LinkVariant: Story = {
  args: {
    children: "Learn more",
    variant: "link",
  },
};

const TrashIcon = () => (
  <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path
      d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M4 4l1 10h6l1-10"
      stroke="currentColor"
      strokeWidth="1.5"
      fill="none"
    />
  </svg>
);

/**
 * Button with icon and label.
 */
export const WithIcon: Story = {
  args: {
    children: "Delete",
    icon: <TrashIcon />,
    anticipation: "destructive",
  },
};

/**
 * A loading button shows a Spinner in the leading icon slot, is marked
 * `aria-busy`, and is disabled so the action cannot be triggered again while
 * it is in flight.
 */
export const Loading: Story = {
  args: {
    children: "Saving",
    loading: true,
  },
};

/**
 * Disabled button using design-tokens disabled state variables.
 */
export const Disabled: Story = {
  args: {
    children: "Disabled",
    disabled: true,
  },
};
