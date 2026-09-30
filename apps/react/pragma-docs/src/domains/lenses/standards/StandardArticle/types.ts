import type { StandardArticle_standard$key } from "#relay/__generated__/StandardArticle_standard.graphql.js";

export interface StandardArticleProps {
  /** Additional CSS class names. */
  className?: string;
  /** Fragment ref of the standard this article reads out. */
  readonly standard: StandardArticle_standard$key;
}
