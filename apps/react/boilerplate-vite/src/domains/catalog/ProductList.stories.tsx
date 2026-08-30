import type { RelayParameters } from "@canonical/storybook-addon-relay";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Suspense } from "react";
import { expect } from "storybook/test";
import { catalogs } from "#i18n/index.js";
import Component from "./ProductList.js";

/**
 * The locale toolbar rerenders every story in the selected locale, so play
 * assertions must never hard-code English copy. Data values (product and
 * viewer names) are locale-independent; translated chrome is asserted
 * against the active locale's own catalog, and counts structurally.
 */
const messagesFor = (locale: unknown): Record<string, unknown> =>
  catalogs[
    (typeof locale === "string" && locale in catalogs
      ? locale
      : "en") as keyof typeof catalogs
  ];

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
  play: async ({ canvas, globals }) => {
    const messages = messagesFor(globals.locale);

    await expect(
      await canvas.findByText("Aurora Dev Board"),
    ).toBeInTheDocument();
    await expect(canvas.getByText("Ada Lovelace")).toBeInTheDocument();
    // Both resolved products render as cards; the summary line is plural-
    // formatted per locale, so the count is asserted structurally.
    await expect(canvas.getAllByRole("article")).toHaveLength(2);
    // The Polar Sensor Kit is the story's out-of-stock product.
    await expect(
      canvas.getByText(String(messages["catalog.outOfStock"]), {
        exact: false,
      }),
    ).toBeInTheDocument();
    await expect(
      canvas.getByText(String(messages["catalog.more"])),
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
  play: async ({ canvas, globals }) => {
    const messages = messagesFor(globals.locale);

    // The list section rendered (its accessible label is locale-scoped)…
    await expect(
      await canvas.findByLabelText(String(messages["catalog.listLabel"])),
    ).toBeInTheDocument();
    // …with no product cards; the summary line is plural-formatted per
    // locale, so emptiness is asserted structurally.
    await expect(canvas.queryByRole("article")).not.toBeInTheDocument();
  },
};
