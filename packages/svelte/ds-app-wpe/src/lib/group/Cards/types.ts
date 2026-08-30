import type { Snippet } from "svelte";
import type { SvelteHTMLElements } from "svelte/elements";

type BaseProps = SvelteHTMLElements["div"];

export interface CardsProps extends BaseProps {
  /** The `Card` elements to lay out. */
  children?: Snippet;
  /**
   * How many master-grid columns each card spans (NOT a pixel width). Fed to the
   * `--card-span` CSS custom property. Larger spans mean fewer, wider cards per
   * row on the 4/8/12-column responsive grid — e.g. on a 12-column grid `1` = 12
   * per row, `2` = 6, `4` = 3.
   * @default 1
   */
  cardSpan?: number;
}
