import { Button } from "@canonical/react-ds-global";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { Label } from "../../lib/subcomponent/Field/Label/index.js";
import { TextInput } from "../../lib/subcomponent/TextInput/index.js";
import "./density-examples.css";

/**
 * Doc examples for the baseline / density guides. Every story turns the 4px
 * baseline overlay ON by default (`parameters.baseline`), so a reader sees text
 * seating on the grid without touching the toolbar. Each example wraps its
 * controls in an explicit density scope (a `.<context> .<density>` class) so the
 * story shows ONE named cell of the matrix, independent of the toolbar globals.
 */
const meta = {
  title: "Documentation/Examples/Density",
  tags: ["!autodocs"],
  parameters: {
    layout: "padded",
    // Baseline overlay ON by default — the point of these examples.
    baseline: true,
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** A named density cell: applies `.<context>` + `.<density>` on a wrapper so the
 *  controls inside size and seat to that exact cell of the matrix. */
const Cell = ({
  context = "app",
  density = "comfortable",
  children,
}: {
  context?: "app" | "site" | "docs";
  density?: "comfortable" | "dense";
  children: ReactNode;
}) => (
  <div className={`${context} ${density}`}>
    <div className="density-example__row">{children}</div>
  </div>
);

/**
 * A button and an input side by side. Their text — the button label and the
 * input value/placeholder — seat on the SAME baseline (a grid line of the
 * overlay), because both are density-seated to the cell's target baseline.
 */
export const ButtonAndInput: Story = {
  render: () => (
    <Cell context="app" density="comfortable">
      <Button importance="primary">Save</Button>
      <Button importance="secondary">Cancel</Button>
      <Label name="email">Email</Label>
      <TextInput name="email" placeholder="you@example.com" />
    </Cell>
  ),
};

/**
 * The same controls at both densities of the apps context. Comfortable is 32px
 * (8 baseline units) tall, dense is 24px (6 bU). In both, the label text still
 * lands on a grid line — the seat is computed against the box, so it holds as the
 * height changes.
 */
export const AppsComfortableVsDense: Story = {
  render: () => (
    <div className="density-example__stack">
      <Cell context="app" density="comfortable">
        <Button importance="primary">Comfortable</Button>
        <TextInput name="a" placeholder="32px tall" />
      </Cell>
      <Cell context="app" density="dense">
        <Button importance="primary">Dense</Button>
        <TextInput name="b" placeholder="24px tall" />
      </Cell>
    </div>
  ),
};

/**
 * Apps (32px) vs sites (36px) at the same comfortable density. A site surface
 * runs one baseline looser, so its controls are taller — yet the text still seats
 * on a grid line in each. Toggle the two rows against the overlay to see the
 * shared rhythm at different heights.
 */
export const AppsVsSites: Story = {
  render: () => (
    <div className="density-example__stack">
      <Cell context="app" density="comfortable">
        <Button importance="primary">Apps</Button>
        <TextInput name="c" placeholder="32px" />
      </Cell>
      <Cell context="site" density="comfortable">
        <Button importance="primary">Sites</Button>
        <TextInput name="d" placeholder="36px" />
      </Cell>
    </div>
  ),
};

/**
 * A borderless primary and a bordered secondary button. Their labels seat on the
 * SAME baseline: the density seat is computed against the control box, not the
 * border, so a borderless and a bordered control of the same density align.
 */
export const BorderlessAndBordered: Story = {
  render: () => (
    <Cell context="site" density="comfortable">
      <Button importance="primary">Primary (no border)</Button>
      <Button importance="secondary">Secondary (1px border)</Button>
    </Cell>
  ),
};
