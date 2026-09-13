import type { StandardsIndex_query$key } from "#relay/__generated__/StandardsIndex_query.graphql.js";

export interface StandardsIndexProps {
  /** Additional CSS class names. */
  className?: string;
  /** Fragment ref over the Query root (the index page's one query). */
  readonly query: StandardsIndex_query$key;
}
