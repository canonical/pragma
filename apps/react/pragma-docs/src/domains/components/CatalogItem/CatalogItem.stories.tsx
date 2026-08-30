import { route } from "@canonical/router-core";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ReactElement, Suspense } from "react";
import { useLazyLoadQuery } from "react-relay";
import type { ComponentsCatalogQuery } from "#relay/__generated__/ComponentsCatalogQuery.graphql.js";
import componentsCatalogQueryNode from "#relay/__generated__/ComponentsCatalogQuery.graphql.js";
import { withRouter } from "../../../../.storybook/decorators/index.js";
import { CatalogList } from "../CatalogList/index.js";
import { CATALOG_PAGE_SIZE } from "../catalogQuery.js";
import CatalogItem from "./CatalogItem.js";

/** Name-compatible bare route so the card's link resolves without
 * mounting the app's real pages. */
const bareRoutes = {
  componentEntity: route({ url: "/components/:uri", content: () => null }),
} as const;

/**
 * A card's fragment ref only exists inside query data (Relay masking), so
 * the single-card state renders through the real list fan-out with the
 * mock generator emitting exactly one edge — what you see IS one
 * `CatalogItem`, produced the way production produces it.
 */
const OneCardFromQuery = (): ReactElement => {
  const data = useLazyLoadQuery<ComponentsCatalogQuery>(
    componentsCatalogQueryNode,
    { count: CATALOG_PAGE_SIZE, cursor: null },
  );
  return (
    <div style={{ maxInlineSize: "24rem" }}>
      <CatalogList query={data} />
    </div>
  );
};

const meta: Meta<typeof CatalogItem> = {
  title: "Components/CatalogItem",
  component: CatalogItem,
  tags: ["autodocs"],
  decorators: [withRouter({ routes: bareRoutes })],
};

export default meta;
type Story = StoryObj<typeof CatalogItem>;

export const Default: Story = {
  render: () => (
    <Suspense fallback={<p>Loading…</p>}>
      <OneCardFromQuery />
    </Suspense>
  ),
  parameters: {
    relay: {
      mockResolvers: {
        Component: () => ({
          name: "Button",
          uri: "ds:global.component.button",
          summary: "Buttons trigger actions within an interface.",
        }),
        Tier: () => ({ name: "Global" }),
        PageInfo: () => ({ hasNextPage: false }),
      },
    },
  },
};
