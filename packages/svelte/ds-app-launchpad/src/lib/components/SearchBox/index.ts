/* @canonical/generator-ds 0.10.0-experimental.4 */

import { SearchButton } from "./common/index.js";
import { default as SearchBoxRoot } from "./SearchBox.svelte";

const SearchBox = SearchBoxRoot as typeof SearchBoxRoot & {
  /**
   * `SearchButton` is the button companion for `SearchBox`.
   *
   * It is available as `SearchBox.SearchButton` and is intended to be used inside `SearchBox` when you want to customize the default button behavior.
   *
   * `disabled` and `aria-label` props can be passed directly to `SearchButton`, but if they are not provided they will reflect their respective values from `SearchBox` context.
   *
   * @example
   * ```svelte
   * <SearchBox aria-label="Search articles">
   *   <SearchBox.SearchButton onclick={handleClick} disabled />
   * </SearchBox>
   * ```
   */
  SearchButton: typeof SearchButton;
};

SearchBox.SearchButton = SearchButton;

export type { SearchButtonProps as SearchBoxSearchButtonProps } from "./common/index.js";
export type { SearchBoxProps } from "./types.js";
export { SearchBox };
