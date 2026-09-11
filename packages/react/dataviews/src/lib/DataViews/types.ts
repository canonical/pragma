import type {
  DataViewsProvider,
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
 */
export type DataViewsProps<
  TFields extends readonly SchemaFieldDefinition[],
  TRow extends object = RowRecord,
> = OwnProps<TFields, TRow>;
