import type {
  DataViewsMessages,
  DataViewsProvider,
  DisplayStatus,
  RowRecord,
  SchemaFieldDefinition,
} from "@canonical/dataviews-core";
import type { ComponentProps, ReactNode } from "react";
import type { DisplayField } from "../../common/index.js";

type OwnProps<
  TFields extends readonly SchemaFieldDefinition[],
  TRow extends object,
> = {
  /** The provider owning this collection's query, result and selection. */
  readonly provider: DataViewsProvider<TFields, TRow>;
  /**
   * The fields each card shows, in order. The one `title` names heads the
   * card; the rest are listed beneath it, each under its heading.
   */
  readonly fields: readonly DisplayField[];
  /**
   * The id of the field that heads each card and names it: the card, and its
   * selection checkbox, are named for this field's value. It must be one of
   * `fields`.
   */
  readonly title: string;
  /** The cards' accessible name. */
  readonly label: string;
  /**
   * Offer a checkbox on each card, and one selecting every card on the page,
   * backed by the provider's selection.
   */
  readonly selectable?: boolean;
  /**
   * Names one record, for its selection checkbox. Defaults to the text of its
   * title field, or its identity when that field holds no text. The latest
   * one is always called, and its identity alone never re-renders a card.
   */
  readonly rowLabel?: (row: TRow, rowId: string) => string;
  /**
   * Replaces the default text of a status: no cards to render, or cards that
   * no longer answer the current query. The status is the core's, decided
   * once from the collection's state, as the table's is.
   */
  readonly renderStatus?: (status: DisplayStatus) => ReactNode;
  /**
   * The words the cards render, over English. Standalone cards are their own
   * root and take them here; the connected cards take their root's.
   */
  readonly messages?: Partial<DataViewsMessages>;
};

/**
 * Cards props. The root is a `section` named by `label`, so it extends
 * native section props, less the ones the cards own: `children`, because
 * their content is the records, which they render themselves; and
 * `aria-label`, `aria-labelledby` and `aria-busy`, which they set from what
 * they know.
 *
 * @experimental Pre-release: a work-in-progress spike, not admitted to the
 * package root; its shape may change or it may be withdrawn.
 */
export type CardsProps<
  TFields extends readonly SchemaFieldDefinition[],
  TRow extends object = RowRecord,
> = OwnProps<TFields, TRow> &
  Omit<
    ComponentProps<"section">,
    | keyof OwnProps<TFields, TRow>
    | "children"
    | "aria-label"
    | "aria-labelledby"
    | "aria-busy"
  >;
