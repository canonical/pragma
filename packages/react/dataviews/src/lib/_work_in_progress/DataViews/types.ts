import type {
  DataViewsProvider,
  FilterHandles,
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
 * The value one root installs for its connected parts and hooks: the
 * provider, at the widest shape the context can hold, and this root's own
 * filter records. The hooks narrow the provider back to its collection's
 * types after checking, at runtime, that the collection is the one they
 * were handed.
 */
export type ContextOptions = {
  readonly provider: DataViewsProvider<readonly SchemaFieldDefinition[]>;
  /**
   * The filter records of this root — one per field and legal operator.
   * The root's, not the provider's: two roots on one provider share the
   * applied query and never each other's half-typed input.
   */
  readonly filters: FilterHandles<readonly SchemaFieldDefinition[]>;
};
