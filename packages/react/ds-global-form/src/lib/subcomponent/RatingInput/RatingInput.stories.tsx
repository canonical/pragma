import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { RatingInput } from "./RatingInput.js";

const meta = {
  title: "_work_in_progress/subcomponent/RatingInput",
  component: RatingInput,
  args: { name: "rating", "aria-label": "Rate this article" },
} satisfies Meta<typeof RatingInput>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Five stars — the default scale. */
export const Default: Story = {
  args: { count: 5 },
};

/** Ten stars for finer-grained ratings. */
export const TenStars: Story = {
  args: { count: 10 },
};

/** Half-star steps: each star splits into two, so 0.5, 1, 1.5 … are selectable. */
export const HalfStars: Story = {
  args: { count: 5, allowHalf: true },
};

/** Pre-filled via `defaultValue` (uncontrolled). */
export const WithInitialValue: Story = {
  args: { count: 5, defaultValue: 3 },
};

export const Disabled: Story = {
  args: { count: 5, defaultValue: 4, disabled: true },
};

/** Controlled: the parent owns the value and shows the current rating. */
export const Controlled: Story = {
  render: (args) => {
    const [value, setValue] = useState(0);
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <RatingInput {...args} value={value} onChange={setValue} />
        <span>{value ? `${value} / ${args.count ?? 5}` : "No rating"}</span>
      </div>
    );
  },
  args: { count: 5 },
};
