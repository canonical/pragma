import type { CatalogList_query$key } from "#relay/__generated__/CatalogList_query.graphql.js";

export interface CatalogListProps {
  /** Additional CSS class names. */
  className?: string;
  /** Fragment ref over the Query root (the catalog page's one query). */
  readonly query: CatalogList_query$key;
}
