import type { ComponentProps, ReactNode } from "react";

type OwnProps = {
  /** The `Card` elements to lay out. */
  children?: ReactNode;
  /**
   * How many master-grid columns each card spans (NOT a pixel width). Fed to the
   * `--card-span` CSS custom property. Larger spans mean fewer, wider cards per
   * row on the 4/8/16-column responsive grid — e.g. on a 16-column grid `1` = 16
   * per row, `2` = 8, `4` = 4.
   * @default 1
   */
  cardSpan?: number;
};

/** Props for the Cards group, extending the native props of its `<div>` root. */
export type CardsProps = OwnProps & Omit<ComponentProps<"div">, keyof OwnProps>;
