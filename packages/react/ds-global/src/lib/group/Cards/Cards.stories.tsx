import type { Meta, StoryObj } from "@storybook/react-vite";
import { fixtureCards, maasCards } from "../../../storybook/cards/fixtures.js";
import Cards from "./Cards.js";

/**
 * `Cards` lays out a set of `Card`s on a shared grid so every card's sections
 * (image, header, content, footer) line up across the row.
 *
 * It **requires a top-level `.grid`** because it is a subgrid — it inherits the
 * master columns and defines the shared section rows. The `grid` story param
 * (`"responsive"` here → fixed 4/8/12 tracks) supplies it on both the canvas and
 * the autodocs page; switch it to `"intrinsic"` / `"none"` from the toolbar.
 *
 * `cardSpan` sets how many master columns each card spans. The component default
 * is `1` (packs the most cards per row); the stories here use `2`+ for legible
 * demos. Sample content is drawn from the Canonical / Ubuntu 26.04 LTS universe.
 */
const meta = {
  title: "groups/Cards",
  component: Cards,
  tags: ["autodocs"],
  parameters: { grid: "responsive" },
  argTypes: {
    cardSpan: { control: { type: "number", min: 1, step: 1 } },
  },
  // Stories span ≥ 2 columns for legibility; the component's own default is
  // still 1 (an undefined prop → span 1).
  args: { cardSpan: 2 },
} satisfies Meta<typeof Cards>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default: cards spanning 2 columns. Despite different copy lengths, images,
 * headings and footers still line up on shared rows.
 */
export const Default: Story = {
  render: (args) => <Cards {...args}>{fixtureCards(3)}</Cards>,
};

/** `cardSpan={2}` — medium cards, more per row than the wide layout. */
export const SpanTwo: Story = {
  args: { cardSpan: 2 },
  render: (args) => <Cards {...args}>{fixtureCards(4)}</Cards>,
};

/** `cardSpan={4}` — wide cards (3 per row on a 12-column grid). */
export const SpanFour: Story = {
  args: { cardSpan: 4 },
  render: (args) => <Cards {...args}>{fixtureCards(6)}</Cards>,
};

// ── Scale: 3 → 15 MAAS machines (one system) ────────────────────────────────

/** Three machines — a small MAAS console view. */
export const ThreeMachines: Story = {
  args: { cardSpan: 4 },
  render: (args) => <Cards {...args}>{maasCards(3)}</Cards>,
};

/** Six machines. */
export const SixMachines: Story = {
  args: { cardSpan: 4 },
  render: (args) => <Cards {...args}>{maasCards(6)}</Cards>,
};

/**
 * Fifteen MAAS machines — a full fleet listing. `cardSpan={2}` tiles them
 * densely while the shared rows keep every hostname, spec and status aligned
 * across the grid.
 */
export const FifteenMachines: Story = {
  args: { cardSpan: 2 },
  render: (args) => <Cards {...args}>{maasCards(15)}</Cards>,
};
