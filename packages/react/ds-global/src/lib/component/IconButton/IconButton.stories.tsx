import { ICON_NAMES } from "@canonical/ds-assets";
import { MODIFIER_FAMILIES } from "@canonical/ds-types";
import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Button } from "../Button/index.js";
import Component from "./IconButton.js";

/**
 * Render every story on a real surface, as Button's stories do, so the button
 * sits on the background it would have in an app.
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
  title: "components/IconButton",
  component: Component,
  decorators: [surface],
  argTypes: {
    importance: {
      control: "select",
      options: [...MODIFIER_FAMILIES.importance],
    },
    anticipation: {
      control: "select",
      options: [undefined, ...MODIFIER_FAMILIES.anticipation],
    },
    icon: {
      control: "select",
      options: [...ICON_NAMES],
    },
  },
  args: {
    onClick: fn(),
    importance: "primary",
    icon: "edit",
    "aria-label": "Edit",
  },
} satisfies Meta<typeof Component>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The default hierarchy: a filled primary icon button. */
export const Primary: Story = {
  args: { importance: "primary" },
};

/** Secondary: the outlined ghost importance. */
export const Secondary: Story = {
  args: { importance: "secondary" },
};

/** Tertiary: the borderless ghost importance, the usual icon-only look. */
export const Tertiary: Story = {
  args: { importance: "tertiary" },
};

/**
 * Loading overlays Button's Spinner on the centred icon, marks the button
 * `aria-busy` and disables it, while the box keeps its size.
 */
export const Loading: Story = {
  args: { loading: true, "aria-label": "Saving" },
};

/** Disabled takes Button's disabled surface, text and icon colours. */
export const Disabled: Story = {
  args: { disabled: true },
};

const row = {
  display: "flex",
  alignItems: "baseline",
  gap: "var(--dimension-200)",
} as const;

/**
 * An icon button beside a line of text and a labelled Button, in a flex row
 * aligned on `baseline`, in both densities with the baseline grid overlay on.
 * The icon button's baseline is a generated line of text seated like
 * Button's label, so the text, the label and the icon button share one
 * baseline, and every box spans the same grid lines; the icon button's box is
 * exactly as wide as it is tall.
 */
export const BaselineAlignment: Story = {
  name: "Baseline alignment",
  parameters: { baseline: true },
  render: (args) => (
    <div style={{ display: "grid", gap: "var(--dimension-400)" }}>
      {(["comfortable", "dense"] as const).map((density) => (
        <div key={density} className={`app ${density}`} style={row}>
          <span style={{ whiteSpace: "nowrap" }}>Instance name</span>
          <Component {...args} importance="tertiary" />
          <Component {...args} importance="secondary" />
          <Component {...args} importance="primary" />
          <Button importance="secondary">Rename</Button>
        </div>
      ))}
    </div>
  ),
};
