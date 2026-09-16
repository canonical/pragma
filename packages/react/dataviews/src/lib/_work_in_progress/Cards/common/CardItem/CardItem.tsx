import { Card } from "@canonical/react-ds-global";
import { CheckboxInput } from "@canonical/react-ds-global-form";
import { memo, type ReactElement, useContext, useId } from "react";
import { MessagesContext } from "../../../../common/index.js";
import { useDataViewsValue } from "../../../../hooks/index.js";
import { readFieldName, spellPrimitiveValue } from "../../../../utils/index.js";
import { FieldValue } from "../FieldValue/index.js";
import type { CardItemProps } from "./types.js";

const componentCssClassName = "data-card";

function CardItem<TRow extends object>({
  provider,
  channels,
  title,
  details,
  selectable,
  nameRecord,
}: CardItemProps<TRow>): ReactElement {
  const messages = useContext(MessagesContext);
  const selected = useDataViewsValue(channels.selected);
  // The name the caller gives the record, read from the record channel as
  // the name itself: a record replaced without changing what it is called
  // re-renders no card, and a card named by its title reads nothing of the
  // record at all. The selector mints its value, which the channel hook
  // allows only because a name is a string: React compares the reads by
  // identity, and equal strings are identical.
  const named = useDataViewsValue(channels.record, (record) =>
    nameRecord(record, channels.id),
  );
  const titleChannel = channels.fields[readFieldName(title)];
  if (titleChannel === undefined) {
    // The scopes observe every field the cards show, the title's included.
    throw new Error(`no channel observes the field "${readFieldName(title)}"`);
  }
  const titleValue = useDataViewsValue(titleChannel);
  const spelled = spellPrimitiveValue(titleValue);
  const titleId = useId();
  // Blank is no name at all: a title holding empty text, or none, leaves the
  // card named by its identity rather than by nothing.
  const shown = spelled !== null && spelled.trim() !== "";
  const name = named ?? (shown ? spelled : channels.id);
  return (
    <Card
      role="listitem"
      // Named by the title it shows wherever that title is text, so a reader
      // hears the words on screen; by the caller's label where it gave one,
      // and by the record's identity where the title shows no text.
      {...(named === null && shown
        ? { "aria-labelledby": titleId }
        : { "aria-label": name })}
      className={componentCssClassName}
    >
      <Card.Header className="header">
        {selectable ? (
          <CheckboxInput
            checked={selected}
            aria-label={messages.selectRow(name)}
            onChange={() => {
              provider.selection.toggle(channels.id);
            }}
          />
        ) : null}
        <span id={titleId} className="title">
          <FieldValue provider={provider} channels={channels} field={title} />
        </span>
      </Card.Header>
      {details.length === 0 ? null : (
        <Card.Content className="content">
          <dl className="fields">
            {details.map((field) => (
              <div key={field.id} className="field">
                <dt>{field.header}</dt>
                <dd>
                  <FieldValue
                    provider={provider}
                    channels={channels}
                    field={field}
                  />
                </dd>
              </div>
            ))}
          </dl>
        </Card.Content>
      )}
    </Card>
  );
}

/**
 * One record as the design system's card: the title field heads it and names
 * it, beside the record's selection checkbox, and the other fields are listed
 * beneath, each under its heading. A list item of the cards' list.
 *
 * Memoised: every prop it takes is held at a stable reference by the cards,
 * so a card re-renders for its own selection, for a name that changed, and
 * for a field list that changed, and for nothing else.
 */
export default memo(CardItem) as typeof CardItem;
