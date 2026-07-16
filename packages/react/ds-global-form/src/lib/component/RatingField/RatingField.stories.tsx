import type { Meta, StoryObj } from "@storybook/react-vite";
import * as decorators from "storybook/decorators.js";
import Component from "./RatingField.js";

const meta = {
  title: "_work_in_progress/component/RatingField",
  component: Component,
  decorators: [decorators.form()],
} satisfies Meta<typeof Component>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { name: "rating", label: "Rate this article", count: 5 },
};

export const TenStars: Story = {
  args: { name: "rating", label: "Score out of ten", count: 10 },
};

export const HalfStars: Story = {
  args: {
    name: "rating",
    label: "Rate this article",
    count: 5,
    allowHalf: true,
    description: "Click the left half of a star for a half rating",
  },
};

export const Prefilled: Story = {
  decorators: [decorators.form({ defaultValues: { rating: 4 } })],
  args: { name: "rating", label: "Rating", count: 5 },
};
