import { route } from "@canonical/router-core";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ReactElement, Suspense } from "react";
import { useLazyLoadQuery } from "react-relay";
import type { StandardsIndexQuery } from "#relay/__generated__/StandardsIndexQuery.graphql.js";
import standardsIndexQueryNode from "#relay/__generated__/StandardsIndexQuery.graphql.js";
import { withRouter } from "../../../../../.storybook/decorators/index.js";
import { STANDARDS_PAGE_SIZE } from "../standardsIndexQuery.js";
import StandardsIndex from "./StandardsIndex.js";

/** Name-compatible bare route so the list's links resolve without
 * mounting the app's real pages. */
const bareRoutes = {
  standardEntity: route({ url: "/standards/:uri", component: () => null }),
} as const;

/**
 * The index's fragment ref only exists inside query data (Relay masking),
 * so the grouped-list state renders through the real page fan-out with
 * the mock generator emitting one edge — what you see IS the composed
 * index, produced the way production produces it.
 */
const IndexFromQuery = (): ReactElement => {
  const data = useLazyLoadQuery<StandardsIndexQuery>(standardsIndexQueryNode, {
    count: STANDARDS_PAGE_SIZE,
    cursor: null,
  });
  return <StandardsIndex query={data} />;
};

const meta: Meta<typeof StandardsIndex> = {
  title: "Standards/StandardsIndex",
  component: StandardsIndex,
  tags: ["autodocs"],
  decorators: [withRouter({ routes: bareRoutes })],
};

export default meta;
type Story = StoryObj<typeof StandardsIndex>;

export const Default: Story = {
  render: () => (
    <Suspense fallback={<p>Loading…</p>}>
      <IndexFromQuery />
    </Suspense>
  ),
  parameters: {
    relay: {
      mockResolvers: {
        CodeStandard: () => ({
          uri: "cs:code.array.safe_access",
          name: null,
        }),
        Category: () => ({ slug: "code" }),
        PageInfo: () => ({ hasNextPage: false }),
      },
    },
  },
};
