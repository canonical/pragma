import type {
  DataViewsProvider,
  SchemaFieldDefinition,
} from "@canonical/dataviews-core";
import type {
  DisplayEntry,
  RowChannels,
} from "@canonical/dataviews-core/bindings";
import type { DisplayField } from "../../../../common/index.js";

/** One record's entry, as the core lists the ones it displays. */
type RecordEntry = Extract<DisplayEntry, { readonly kind: "record" }>;

/**
 * Props of the list of cards.
 *
 * Exempt from the native-prop extension convention: an internal renderer
 * laying out the cards, not forwarding a caller's native props.
 */
export type CardListProps<TRow extends object> = {
  readonly provider: DataViewsProvider<readonly SchemaFieldDefinition[], TRow>;
  /** The record entries the core displays, in its order. */
  readonly records: readonly RecordEntry[];
  /** One record's channels, by its identity. */
  readonly readRow: (rowId: string) => RowChannels<TRow>;
  /** The field heading each card and naming it. */
  readonly title: DisplayField;
  /** The fields listed beneath the title, in order. */
  readonly details: readonly DisplayField[];
  /** Offer each card's selection checkbox. */
  readonly selectable: boolean;
  /**
   * Names a record for its checkbox, or answers null to leave it named by
   * its title field's text.
   */
  readonly nameRecord: (row: TRow, rowId: string) => string | null;
};
