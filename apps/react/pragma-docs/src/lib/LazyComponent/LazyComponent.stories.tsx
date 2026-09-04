import type { Meta, StoryObj } from "@storybook/react-vite";
import { Suspense } from "react";
import Component from "./LazyComponent.js";

const meta = {
  title: "LazyComponent",
  component: Component,
  // LazyComponent suspends, so every story renders inside a Suspense boundary —
  // the same pattern the homepage uses to stream it during SSR.
  decorators: [
    (Story) => (
      <Suspense fallback={<p>Loading…</p>}>
        <Story />
      </Suspense>
    ),
  ],
} satisfies Meta<typeof Component>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
