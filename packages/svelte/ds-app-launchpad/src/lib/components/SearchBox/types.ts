/* @canonical/generator-ds 0.10.0-experimental.4 */

import type { Snippet } from "svelte";
import type { HTMLInputAttributes } from "svelte/elements";
import type { TextInputPrimitiveProps } from "../common/index.js";

export interface SearchBoxProps extends Omit<TextInputPrimitiveProps, "type"> {
  /**
   * The accessible name for the input.
   *
   * A search input's purpose is usually clear for sighted users, but screen reader users may not have the same context. Providing an accessible name helps ensure that all users understand the purpose of the input (see: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/search#search_form_labels_and_accessibility).
   */
  "aria-label": string;
  /**
   * Whether to apply the invalid styles to the input when it fails native validation (`:user-invalid`) or `aria-invalid="true"` is set.
   *
   * @default false
   * This is opt-in because search landmarks often have submission requirements, such as `required` and `minlength`, where you may want to block submission without showing a visual invalid state.
   */
  shouldRenderInvalidStyles?: boolean;
  /**
   * The content to render instead of the default `SearchBox.SearchButton`. This is useful when you want to customize the default button behavior, such as adding an `onclick` handler.
   */
  children?: Snippet<[]>;
}

export type SearchBoxContext = {
  disabled: HTMLInputAttributes["disabled"];
  "aria-label": string;
};
