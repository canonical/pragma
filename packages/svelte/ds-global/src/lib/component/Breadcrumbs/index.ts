import { default as BreadcrumbsRoot } from "./Breadcrumbs.svelte";
import { Item } from "./common/index.js";

const Breadcrumbs = BreadcrumbsRoot as typeof BreadcrumbsRoot & {
  /**
   * Default breadcrumb item renderer, with link and separator.
   * Can be replaced per-item by providing a custom `render` snippet
   * on the item.
   *
   * @example
   * ```svelte
   * <Breadcrumbs.Item url="/products" label="Products" />
   * ```
   */
  Item: typeof Item;
};
Breadcrumbs.Item = Item;

export type { ItemProps } from "./common/index.js";
export type * from "./types.js";
export { Breadcrumbs };
