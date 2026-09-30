import { ICON_NAMES } from "@canonical/ds-assets";
import { MODIFIER_FAMILIES } from "@canonical/ds-types";
import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import type React from "react";
import { Fragment } from "react";
import { fn } from "storybook/test";

import Component from "./Button.js";

/**
 * Render every story on a real surface: the `.surface` class defines the
 * `--surface-color-*` channels and the div paints itself with them (surfaces
 * consume themselves), so buttons sit on the same background they would in an
 * app rather than the bare Storybook canvas.
 */
const surface: Decorator = (Story) => (
  <div
    className="surface"
    style={{
      background: "var(--surface-color-background)",
      color: "var(--surface-color-text)",
      padding: "var(--dimension-300, 24px)",
    }}
  >
    <Story />
  </div>
);

const meta = {
  title: "components/Button",
  component: Component,
  decorators: [surface],
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
    // Icon is a design-system icon NAME (not arbitrary markup): a select over the
    // ds-assets icon set, with `undefined` = no icon (the default).
    icon: {
      control: "select",
      options: [undefined, ...ICON_NAMES],
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

/** The importance × anticipation grid: importance as rows, the neutral base
 *  plus every anticipation as columns. Shared by the Matrix and DisabledMatrix
 *  stories. */
const MatrixGrid = (args: React.ComponentProps<typeof Component>) => (
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
        <span style={{ fontSize: "0.75rem", opacity: 0.6 }}>{importance}</span>
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
);

/**
 * The full variant matrix: each importance (rows) combined with the neutral
 * base and every anticipation (columns). Importance decides how the colour is
 * applied — primary fills, secondary outlines, tertiary is text — while
 * anticipation (and the neutral base) decides which colour. The two compose
 * orthogonally.
 */
export const Matrix: Story = {
  render: (args) => <MatrixGrid {...args} />,
  args: { children: "Button" },
};

/**
 * The same matrix in the disabled state — every importance × anticipation
 * combination rendered `disabled`, so the disabled treatment is visible across
 * the whole grid.
 */
export const DisabledMatrix: Story = {
  render: (args) => <MatrixGrid {...args} />,
  args: { children: "Button", disabled: true },
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

/**
 * The full matrix with a leading icon in every cell — so the icon colour can be
 * checked against each importance × anticipation combination (the icon should
 * follow the label colour: contrast on a filled primary, the modifier colour on
 * ghost secondary/tertiary). The `icon` prop takes a design-system icon name;
 * the sprite is served from the `@canonical/ds-assets` staticDir at `/icons`.
 */
export const IconMatrix: Story = {
  render: (args) => <MatrixGrid {...args} />,
  args: { children: "Button", icon: "edit" },
};

/**
 * The icon matrix in the disabled state — the icon should dim with the label
 * across every combination.
 */
export const DisabledIconMatrix: Story = {
  render: (args) => <MatrixGrid {...args} />,
  args: { children: "Button", icon: "edit", disabled: true },
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
