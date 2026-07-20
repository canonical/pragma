import type { CatalogItem_component$key } from "#relay/__generated__/CatalogItem_component.graphql.js";

export interface CatalogItemProps {
  /** Additional CSS class names. */
  className?: string;
  /** Fragment ref of the component this card presents. */
  readonly component: CatalogItem_component$key;
}
