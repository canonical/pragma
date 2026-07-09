import type { RelayParameters } from "@canonical/storybook-addon-relay";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Suspense } from "react";
import { expect } from "storybook/test";
import Component from "./ProductList.js";

const meta = {
  title: "Catalog/ProductList",
  component: Component,
  // `useLazyLoadQuery` suspends while the (mocked) query is in flight, so
  // every story renders inside a Suspense boundary — the same shape the
  // catalog page uses.
  decorators: [
    (Story) => (
      <Suspense fallback={<p>Loading catalog…</p>}>
        <Story />
      </Suspense>
    ),
  ],
} satisfies Meta<typeof Component>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * `@canonical/storybook-addon-relay` reads `parameters.relay` and resolves
 * the story's operations with `MockPayloadGenerator` + these resolvers.
 * Every displayed field is resolved explicitly so the story is deterministic
 * for visual regression testing.
 */
export const Default: Story = {
  parameters: {
    relay: {
      mockResolvers: {
        Viewer: () => ({ name: "Ada Lovelace" }),
        ProductConnection: () => ({
          totalCount: 5,
          pageInfo: { hasNextPage: true },
          edges: [
            {
              node: {
                id: "Product:story-1",
                name: "Aurora Dev Board",
                tagline: "A hackable single-board computer for prototyping",
                priceCents: 14_900,
                currency: "USD",
                rating: 4.6,
                inStock: true,
              },
            },
            {
              node: {
                id: "Product:story-2",
                name: "Polar Sensor Kit",
                tagline: "Twelve calibrated sensors in a rugged case",
                priceCents: 8_900,
                currency: "USD",
                rating: 4.2,
                inStock: false,
              },
            },
          ],
        }),
      },
    } satisfies RelayParameters,
  },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText("Aurora Dev Board"),
    ).toBeInTheDocument();
    await expect(canvas.getByText("Ada Lovelace")).toBeInTheDocument();
    await expect(
      canvas.getByText(/showing 2 of 5 products/),
    ).toBeInTheDocument();
    // The Polar Sensor Kit is the story's out-of-stock product.
    await expect(canvas.getByText(/out of stock/)).toBeInTheDocument();
    await expect(
      canvas.getByText("More products are available."),
    ).toBeInTheDocument();
  },
};

export const EmptyCatalog: Story = {
  parameters: {
    relay: {
      mockResolvers: {
        Viewer: () => ({ name: "Ada Lovelace" }),
        ProductConnection: () => ({
          totalCount: 0,
          pageInfo: { hasNextPage: false },
          edges: [],
        }),
      },
    } satisfies RelayParameters,
  },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText(/showing 0 of 0 products/),
    ).toBeInTheDocument();
    await expect(canvas.queryByRole("article")).not.toBeInTheDocument();
  },
};
