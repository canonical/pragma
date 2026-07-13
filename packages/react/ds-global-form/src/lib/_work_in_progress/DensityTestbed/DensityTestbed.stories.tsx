import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  ControlsLine,
  ListsLine,
  NavigationLine,
  TypographyLine,
} from "./Testbed.js";

/**
 * # Baseline-alignment spike (work in progress)
 *
 * Line-based spike surface. Each story is ONE bucket rendered on a single
 * horizontal line: a few letters of paragraph text at the start (baseline
 * reference), then the components inline. No cards, no labels — just alignment.
 *
 * The 4px baseline grid (strict stepped bands) is drawn by the styles-debug
 * plugin, applied automatically via `parameters: { baseline: true }`. Buckets
 * with controls carry a current ↔ proposed model toggle; Typography is pure
 * engine output at several sizes.
 */
const meta = {
  title: "_work_in_progress/BaselineAlignmentSpike",
  tags: ["!autodocs"],
  parameters: {
    layout: "fullscreen",
    baseline: true,
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Controls — buttons + inputs on one line. */
export const Controls: Story = { render: () => <ControlsLine /> };

/** Navigation — tab / side-nav items on one line. */
export const Navigation: Story = { render: () => <NavigationLine /> };

/** Lists — list/table rows (shared border) on one line. */
export const Lists: Story = { render: () => <ListsLine /> };

/** Typography — real paragraph text at several sizes; witness the 4px baseline. */
export const Typography: Story = { render: () => <TypographyLine /> };
