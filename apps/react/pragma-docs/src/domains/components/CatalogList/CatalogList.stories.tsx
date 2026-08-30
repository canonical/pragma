import { route } from "@canonical/router-core";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ReactElement, Suspense } from "react";
import { useLazyLoadQuery } from "react-relay";
import type { ComponentsCatalogQuery } from "#relay/__generated__/ComponentsCatalogQuery.graphql.js";
import componentsCatalogQueryNode from "#relay/__generated__/ComponentsCatalogQuery.graphql.js";
import { withRouter } from "../../../../.storybook/decorators/index.js";
import { CATALOG_PAGE_SIZE } from "../catalogQuery.js";
import CatalogList from "./CatalogList.js";

/** Name-compatible bare route so card links resolve without mounting the
 * app's real pages. */
const bareRoutes = {
  componentEntity: route({ url: "/components/:uri", content: () => null }),
} as const;

/**
 * Story harness: the catalog query against the addon's mock environment
 * provides the Query-root fragment ref the list paginates over.
 */
const ListFromQuery = (): ReactElement => {
  const data = useLazyLoadQuery<ComponentsCatalogQuery>(
    componentsCatalogQueryNode,
    { count: CATALOG_PAGE_SIZE, cursor: null },
  );
  return <CatalogList query={data} />;
};

const meta: Meta<typeof CatalogList> = {
  title: "Components/CatalogList",
  component: CatalogList,
  tags: ["autodocs"],
  decorators: [withRouter({ routes: bareRoutes })],
};

export default meta;
type Story = StoryObj<typeof CatalogList>;

export const Default: Story = {
  render: () => (
    <Suspense fallback={<p>Loading…</p>}>
      <ListFromQuery />
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
