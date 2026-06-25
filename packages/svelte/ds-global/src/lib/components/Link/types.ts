import type { Snippet } from "svelte";
import type { HTMLAnchorAttributes } from "svelte/elements";

export interface LinkProps extends HTMLAnchorAttributes {
  /** Link contents */
  children?: Snippet;
  /**
   * Link appearance modifier.
   * - `"soft"`: inherits the text color of its parent element.
   */
  appearance?: "soft";
}
