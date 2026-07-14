import type { CSSProperties, ReactElement } from "react";
import type { CardsProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds cards subgrid";

/**
 * Cards — lays out a set of `Card`s on a shared grid so that not only the cards
 * themselves, but each card's SECTIONS (image, header, content, footer) line up
 * across the row.
 *
 * @remarks
 * **Requires a top-level grid.** `Cards` is a `.subgrid`: it inherits the column
 * tracks of the nearest parent `.grid` rather than defining its own. Wrap it in
 * a `.grid` (e.g. the `grid()` storybook decorator or the `grid` addon param,
 * the same way Accordion or a form field opts in). Outside a grid it degrades to
 * a plain block — still renders, just without column alignment.
 *
 * **Two-level subgrid.** The parent grid supplies the columns; `Cards` inherits
 * them and defines the shared section ROW tracks; each `Card` spans `cardSpan`
 * columns and is itself a row-subgrid, so its sections snap to the shared
 * tracks. See `styles.css` for the full model.
 *
 * **`cardSpan`** is the number of master columns each card spans (not a pixel
 * width) — use multiples of 2/4 so cards tile evenly into the 4/8/12-column
 * responsive grid.
 *
 * @example
 * ```tsx
 * // inside a `.grid` context (decorator/addon)
 * <Cards cardSpan={4}>
 *   <Card>…</Card>
 *   <Card>…</Card>
 *   <Card>…</Card>
 * </Cards>
 * ```
 *
 * @implements dso:global.group.cards
 * @returns {ReactElement} the Cards group
 */
const Cards = ({
  className,
  children,
  cardSpan = 1,
  style,
  ...props
}: CardsProps): ReactElement => {
  // Guard the column span: a 0/negative/NaN/non-integer would produce an invalid
  // `span …` and break the layout. At least 1.
  const span = Math.max(1, Math.floor(Number(cardSpan) || 1));

  const cardsStyle: CSSProperties = {
    ...style,
    "--card-span": span,
  } as CSSProperties;

  return (
    <div
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      style={cardsStyle}
      {...props}
    >
      {children}
    </div>
  );
};

export default Cards;
