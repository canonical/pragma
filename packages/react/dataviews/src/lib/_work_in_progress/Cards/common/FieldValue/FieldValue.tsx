import { memo, type ReactElement, useMemo } from "react";
import {
  CellContext,
  type CellContextValue,
} from "../../../../common/index.js";
import { useDataViewsValue } from "../../../../hooks/index.js";
import { readFieldName, spellPrimitiveValue } from "../../../../utils/index.js";
import type { FieldValueProps } from "./types.js";

function FieldValue<TRow extends object>({
  provider,
  channels,
  field,
}: FieldValueProps<TRow>): ReactElement {
  const name = readFieldName(field);
  const channel = channels.fields[name];
  if (channel === undefined) {
    // The scopes observe every field the cards show, so a value without its
    // channel is a card built against another field list.
    throw new Error(`no channel observes the field "${name}"`);
  }
  const value = useDataViewsValue(channel);
  const cell = useMemo<CellContextValue>(
    () => ({
      collection: provider.collection,
      rowId: channels.id,
      columnId: field.id,
      record: channels.record,
      fields: channels.fields,
      selected: channels.selected,
    }),
    [provider, channels, field.id],
  );
  const Content = field.cell;
  return (
    <CellContext value={cell}>
      {Content === undefined ? (
        spellPrimitiveValue(value)
      ) : (
        <Content value={value} rowId={channels.id} columnId={field.id} />
      )}
    </CellContext>
  );
}

/**
 * One field's value on a card, inside the same cell scope a table's cell
 * installs, so a field's own `cell` renders unchanged on a card and may call
 * `useDataViewsCell` for the record's channels. Without one, primitive values
 * render as text and every other value renders nothing.
 *
 * It subscribes to its own field's channel, so a record update re-renders
 * only the values that changed. Memoised, so a card re-rendering for its
 * selection re-renders none of them.
 */
export default memo(FieldValue) as typeof FieldValue;
