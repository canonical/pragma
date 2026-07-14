import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  BaselineProofLine,
  BoxedProofLine,
  ControlsLine,
  EditorialLine,
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

/**
 * Editorial — `.editorial` prose inside the density scope. Witnesses DS.04: prose
 * keeps its engine-owned natural leading + inter-block margins and stays on-grid,
 * while density seats controls. Toggle context/density — prose rhythm must not
 * change, proving they compose instead of collide.
 */
export const Editorial: Story = { render: () => <EditorialLine /> };

/**
 * DS.01 — the size-agnostic `.baseline` class. Arbitrary off-scale font sizes,
 * each snapped to the grid by `.baseline` alone (no tier). Proves the alignment
 * machinery is decoupled from any particular font size.
 */
export const BaselineClass: Story = { render: () => <BaselineProofLine /> };

/**
 * DS.02 — `.baseline-boxed` bottom-referenced fixed box. Dense (24px) and
 * comfortable (32px) rows; within each, mixed sizes share a box height and a
 * baseline a fixed distance up from the bottom.
 */
export const BoxedBaseline: Story = { render: () => <BoxedProofLine /> };
