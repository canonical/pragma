import type {
  DataViewsProvider,
  Identity,
  ReadonlyChannel,
  RowRecord,
  SchemaFieldDefinition,
} from "@canonical/dataviews-core";
import type { ReactNode } from "react";

type OwnProps<
  TFields extends readonly SchemaFieldDefinition[],
  TRow extends object,
> = {
  /** The provider created by `createDataViewsProvider` for this collection. */
  readonly provider: DataViewsProvider<TFields, TRow>;
  /** The composition's children; optional for host-specific shells. */
  readonly children?: ReactNode;
};

/**
 * Props of the DataViews root. A context mount, not a DOM element.
 *
 * The record type travels with the provider: a provider built for a row
 * type mounts as itself rather than as the widest record shape, which the
 * channel's own invariance would otherwise refuse.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type DataViewsProps<
  TFields extends readonly SchemaFieldDefinition[],
  TRow extends object = RowRecord,
> = OwnProps<TFields, TRow>;

/**
 * The value installed per rendered cell by the table renderer: the owning
 * provider, stable row and column identifiers, and the cell's observable
 * channels. The channels are read-only: a cell scope is a projection, not
 * another place to publish from.
 *
 * The provider is held as what its one consumer uses it for — a witness
 * compared by reference. Typing it as the whole provider would fix a field
 * list the table cannot know, and every table would cast its own provider
 * to satisfy it.
 */
export type CellScopeValue = {
  readonly provider: { readonly identity: Identity };
  readonly rowId: string;
  readonly columnId: string;
  readonly row: ReadonlyChannel<unknown>;
  readonly fields: Readonly<Record<string, ReadonlyChannel<unknown>>>;
  readonly selected: ReadonlyChannel<boolean>;
};
