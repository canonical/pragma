import { Cards as CardGroup } from "@canonical/react-ds-global";
import { memo, type ReactElement } from "react";
import { CardItem } from "../CardItem/index.js";
import type { CardListProps } from "./types.js";

/**
 * The layout the design system's Cards group needs: its own grid preset,
 * whose columns the group takes as a subgrid.
 */
const componentCssClassName = "grid intrinsic";

/**
 * How many of the grid's columns a card spans: the intrinsic grid groups its
 * columns in fours, so one card fills one group. Provisional, like the rest
 * of the spike's layout.
 */
const CARD_SPAN = 4;

function CardList<TRow extends object>({
  provider,
  records,
  readRow,
  title,
  details,
  selectable,
  nameRecord,
}: CardListProps<TRow>): ReactElement {
  return (
    <div className={componentCssClassName}>
      <CardGroup role="list" cardSpan={CARD_SPAN}>
        {records.map((entry) => (
          <CardItem
            key={entry.id}
            provider={provider}
            channels={readRow(entry.rowId)}
            title={title}
            details={details}
            selectable={selectable}
            nameRecord={nameRecord}
          />
        ))}
      </CardGroup>
    </div>
  );
}

/**
 * Every card the core displays, in its order, laid out by the design
 * system's Cards group so each card's sections line up across the row.
 *
 * Memoised, and every prop it takes is held at one reference by the cards, so
 * a publication that changes neither the records shown nor the fields
 * re-renders no card at all.
 */
export default memo(CardList) as typeof CardList;
