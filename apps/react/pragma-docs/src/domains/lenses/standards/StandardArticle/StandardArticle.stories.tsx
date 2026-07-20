import { route } from "@canonical/router-core";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ReactElement, Suspense } from "react";
import { useLazyLoadQuery } from "react-relay";
import type { StandardEntityQuery } from "#relay/__generated__/StandardEntityQuery.graphql.js";
import standardEntityQueryNode from "#relay/__generated__/StandardEntityQuery.graphql.js";
import { withRouter } from "../../../../../.storybook/decorators/index.js";
import StandardArticle from "./StandardArticle.js";

/** Name-compatible bare route so the extends links resolve without
 * mounting the app's real pages. */
const bareRoutes = {
  standardEntity: route({ url: "/standards/:uri", component: () => null }),
} as const;

/**
 * The article's fragment ref only exists inside query data (Relay
 * masking), so the reading column renders through the real query fan-out
 * — what you see IS the article, produced the way production produces
 * it.
 */
const ArticleFromQuery = (): ReactElement => {
  const data = useLazyLoadQuery<StandardEntityQuery>(standardEntityQueryNode, {
    uri: "cs:code.array.safe_access",
  });
  if (!data.codeStandard) return <p>No standard.</p>;
  return <StandardArticle standard={data.codeStandard} />;
};

const meta: Meta<typeof StandardArticle> = {
  title: "Standards/StandardArticle",
  component: StandardArticle,
  tags: ["autodocs"],
  decorators: [withRouter({ routes: bareRoutes })],
};

export default meta;
type Story = StoryObj<typeof StandardArticle>;

export const Default: Story = {
  render: () => (
    <Suspense fallback={<p>Loading…</p>}>
      <ArticleFromQuery />
    </Suspense>
  ),
  parameters: {
    relay: {
      mockResolvers: {
        CodeStandard: () => ({
          uri: "cs:code.array.safe_access",
          name: null,
          description:
            "Use `.at(index)` instead of bracket notation for array element access.\n\nBracket notation (`arr[i]`) returns `T` in TypeScript even though the index may be out of bounds — the `.at(index)` form makes the fallibility visible.",
        }),
        Category: () => ({ slug: "code" }),
      },
    },
  },
};
