import type { Meta, StoryObj } from "@storybook/react-vite";
import { Spike } from "./Testbed.js";

/**
 * # Baseline-alignment spike (work in progress)
 *
 * A spike surface, not a shipping component. Explores:
 *
 * 1. A **4px baseline grid** (down from the shipped 8px), with an alternating
 *    colour-banded overlay so the denser grid stays readable. Toggle with the
 *    **grid** checkbox.
 * 2. An alternative **alignment model** for boxed controls. Switch **current**
 *    ↔ **proposed** in the toolbar:
 *    - *current* — the shipped engine forces both borders onto the grid;
 *      interior spacing can be asymmetric.
 *    - *proposed* — top border on grid, top nudge mirrored below the text
 *      (symmetric interior), bottom border free, external `margin-block-end`
 *      compensates so total occupied height is a 4px multiple.
 *
 * Each bucket puts a baseline-aligned **paragraph beside the components** so you
 * can read control baselines against prose on the same grid. Buckets are grouped
 * by height family: Controls, Navigation, Lists.
 */
const meta = {
  title: "_work_in_progress/BaselineAlignmentSpike",
  tags: ["!autodocs"],
  parameters: {
    layout: "fullscreen",
    // Auto-apply the shared baseline-grid overlay (storybook-addon-utils reads
    // this parameter now) — no manual toolbar toggle, no per-story class.
    baseline: true,
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Starts on the current (shipped) model — the baseline to compare against. */
export const Current: Story = {
  render: () => <Spike initialModel="current" />,
};

/** Starts on the proposed model — symmetric interior + external compensation. */
export const Proposed: Story = {
  render: () => <Spike initialModel="proposed" />,
};
