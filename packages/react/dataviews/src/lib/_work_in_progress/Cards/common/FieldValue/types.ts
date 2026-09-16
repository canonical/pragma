import type {
  DataViewsProvider,
  SchemaFieldDefinition,
} from "@canonical/dataviews-core";
import type { RowChannels } from "@canonical/dataviews-core/bindings";
import type { DisplayField } from "../../../../common/index.js";

/**
 * Props of one field's value on a card.
 *
 * Exempt from the native-prop extension convention: it renders the field's
 * content, or the field's own `cell`, with no element of its own to forward
 * a caller's props to.
 */
export type FieldValueProps<TRow extends object> = {
  readonly provider: DataViewsProvider<readonly SchemaFieldDefinition[], TRow>;
  /** The card's row channels, from the cards' row scopes. */
  readonly channels: RowChannels<TRow>;
  /** The field shown. */
  readonly field: DisplayField;
};
