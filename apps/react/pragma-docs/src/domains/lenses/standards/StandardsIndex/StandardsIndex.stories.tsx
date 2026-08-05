import { route } from "@canonical/router-core";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ReactElement, Suspense } from "react";
import { useLazyLoadQuery } from "react-relay";
import type { StandardsIndexQuery } from "#relay/__generated__/StandardsIndexQuery.graphql.js";
import standardsIndexQueryNode from "#relay/__generated__/StandardsIndexQuery.graphql.js";
import { withRouter } from "../../../../../.storybook/decorators/index.js";
import { standardsIndexVariables } from "../standardsIndexQuery.js";
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
  const data = useLazyLoadQuery<StandardsIndexQuery>(
    standardsIndexQueryNode,
    standardsIndexVariables(),
  );
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
        // The index now enumerates a class's instances, so the mocks are
        // the TBox shape: a bound class, and nodes that describe
        // themselves through `_meta`.
        OntologyClass: () => ({
          uri: "http://pragma.canonical.com/codestandards#CodeStandard",
        }),
        EntityMeta: () => ({
          curie: "cs:code.array.safe_access",
          title: "code.array.safe_access",
        }),
        PageInfo: () => ({ hasNextPage: false }),
      },
    },
  },
};
