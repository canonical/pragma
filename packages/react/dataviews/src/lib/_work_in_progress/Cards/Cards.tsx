import type {
  DisplayStatus,
  RowRecord,
  SchemaFieldDefinition,
} from "@canonical/dataviews-core";
import {
  areDisplayStatusesEqual,
  areListsEqual,
  isDataViewsProvider,
  listDisplayEntries,
  resolveDisplayStatus,
} from "@canonical/dataviews-core/bindings";
import { type ReactElement, useCallback, useEffect, useMemo } from "react";
import {
  type DisplayField,
  MessagesContext,
  StatusItem,
} from "../../common/index.js";
import {
  useDataViewsValue,
  useMessages,
  useRowScopes,
  useStableCallback,
  useStableValue,
} from "../../hooks/index.js";
import {
  areDisplayFieldsEqual,
  describeStatus,
  readFieldName,
} from "../../utils/index.js";
import { CardList, SelectAllOnPage } from "./common/index.js";
import type { CardsProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds data-cards";

/** Two lists naming the same fields in the same order. */
const areNamesEqual = (a: readonly string[], b: readonly string[]): boolean =>
  areListsEqual(a, b, (name, other) => name === other);

/**
 * Cards render the records of one collection as the design system's cards:
 * one card per record on the page, each headed and named by its title field,
 * with the other fields listed beneath it. They are a list, and each card an
 * item of it, so a reader moves through them in order with no key of their
 * own to learn.
 *
 * They render records and nothing else: they do not fetch, sort or page.
 * Their provider is explicit, so the same cards work standalone and inside a
 * DataViews root, and they read what the table reads — the query's rows, the
 * core's status and the selection — so a record selected on a card is
 * selected in every table on the provider. A field's own `cell` renders on a
 * card as it does in a table cell.
 *
 * With `selectable`, each card carries its checkbox, and one checkbox above
 * the cards selects or clears every card on the page, leaving a selection
 * made elsewhere alone. The core's status shows above the cards, as the
 * table's does: in place of them when nothing is displayable, and over them
 * when they no longer answer the query.
 *
 * Every word they render comes from `messages`, over English; the fields and
 * the records are the application's own. Inside a DataViews root the connected
 * cards take the root's words instead.
 *
 * Without scripting the cards are plain list markup drawn on the server with
 * the rows of the URL's query, and their checkboxes native; ordering and
 * paging are the sort panel's and the pagination bar's, placed beside them.
 *
 * Not exported from the package root: a work-in-progress spike, imported from
 * its own module until it is admitted.
 *
 * @implements ds:global.group.cards
 *
 * @experimental Pre-release: a work-in-progress spike, not admitted to the
 * package root; its shape may change or it may be withdrawn.
 */
export default function Cards<
  TFields extends readonly SchemaFieldDefinition[],
  TRow extends object = RowRecord,
>({
  provider,
  fields,
  title,
  label,
  selectable = false,
  rowLabel,
  renderStatus,
  messages,
  className,
  ...rest
}: CardsProps<TFields, TRow>): ReactElement {
  if (!isDataViewsProvider(provider)) {
    throw new Error(
      "Cards requires a provider created by createDataViewsProvider",
    );
  }
  const words = useMessages(messages);
  const declared = useStableValue(fields, areDisplayFieldsEqual);
  // Looked up in the held list, which holds the ids the caller's list holds:
  // one lookup names the card's heading and checks that the title names a
  // field at all.
  const heading = declared.find((field) => field.id === title);
  if (heading === undefined) {
    throw new Error(`Cards names no field "${title}" as its title`);
  }
  // Observed for as long as the cards are mounted, as a table observes it.
  useEffect(() => provider.observe(), [provider]);
  const details = useMemo(
    () => declared.filter((field) => field.id !== title),
    [declared, title],
  );
  const names = useStableValue(declared.map(readFieldName), areNamesEqual);
  const scopes = useRowScopes(provider, names);
  const state = useDataViewsValue(provider.state);
  const status = useStableValue(
    resolveDisplayStatus(state),
    areDisplayStatusesEqual,
  );
  const ids = useDataViewsValue(scopes.ids);
  const entries = useMemo(
    () => listDisplayEntries({ rowIds: ids, status }),
    [ids, status],
  );
  // The core's entries: the status first, then the records it keeps.
  const records = useMemo(
    () => entries.flatMap((entry) => (entry.kind === "record" ? [entry] : [])),
    [entries],
  );
  // Held behind one identity: a lambda must not re-render every card. Null
  // until the caller names records, so a card names itself by its title.
  const nameRecord = useStableCallback(
    (row: TRow, rowId: string): string | null =>
      rowLabel === undefined ? null : rowLabel(row, rowId),
  );
  // The words' own text for a status, unless the caller renders its own.
  const describe = useCallback(
    (shown: DisplayStatus) => describeStatus(shown, words),
    [words],
  );
  const showStatus = renderStatus ?? describe;
  return (
    <MessagesContext value={words}>
      <section
        {...rest}
        className={[componentCssClassName, className].filter(Boolean).join(" ")}
        aria-label={label}
        aria-busy={state.pendingRequestId !== null}
      >
        {selectable ? (
          <SelectAllOnPage selection={provider.selection} ids={scopes.ids} />
        ) : null}
        {status === null ? null : (
          <StatusItem status={status} renderStatus={showStatus} />
        )}
        <CardList
          provider={provider}
          records={records}
          readRow={scopes.readRow}
          title={heading}
          details={details}
          selectable={selectable}
          nameRecord={nameRecord}
        />
      </section>
    </MessagesContext>
  );
}
