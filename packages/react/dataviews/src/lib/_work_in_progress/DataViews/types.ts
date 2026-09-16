import type {
  DataViewsMessages,
  DataViewsProvider,
  FilterHandles,
  RowRecord,
  SchemaFieldDefinition,
} from "@canonical/dataviews-core";
import type { ReactNode } from "react";
import type { AnnouncerTopic } from "../../common/index.js";

type OwnProps<
  TFields extends readonly SchemaFieldDefinition[],
  TRow extends object,
> = {
  /** The provider created by `createDataViewsProvider` for this collection. */
  readonly provider: DataViewsProvider<TFields, TRow>;
  /**
   * The words every part of the root renders and announces, over the English
   * record: any of them, or all. A whole replacement annotated as
   * `DataViewsMessages` fails to compile while it misses one. Held while its
   * members stay the same, so an object of strings written inline costs
   * nothing; a worded message written inline is a new function on every
   * render, and every part that reads it renders again, so define those once
   * — at module scope, or held by the application.
   */
  readonly messages?: Partial<DataViewsMessages>;
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
 * provider, at the widest shape the context can hold, this root's own
 * filter records and the words it speaks. The hooks narrow the provider back
 * to its collection's types after checking, at runtime, that the collection
 * is the one they were handed.
 */
export type ContextOptions = {
  readonly provider: DataViewsProvider<readonly SchemaFieldDefinition[]>;
  /** Every message the root's parts render or announce, resolved over English. */
  readonly messages: DataViewsMessages;
  /**
   * Say an outcome that has no place on screen through the root's one
   * announcer, which belongs to this root's UI scope: a part says what its own
   * command did, so a second root over the provider says nothing of it.
   */
  readonly announce: (message: ReactNode, topic?: AnnouncerTopic) => void;
  /**
   * The filter records of this root — one per field and legal operator.
   * The root's, not the provider's: two roots on one provider share the
   * applied query and never each other's half-typed input.
   */
  readonly filters: FilterHandles<readonly SchemaFieldDefinition[]>;
};
