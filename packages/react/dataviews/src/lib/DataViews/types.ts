import type {
  DataViewsProvider,
  SchemaFieldDefinition,
} from "@canonical/dataviews-core";
import type { ReactNode } from "react";

type OwnProps<TFields extends readonly SchemaFieldDefinition[]> = {
  /** The provider created by `createDataViewsProvider` for this collection. */
  readonly provider: DataViewsProvider<TFields>;
  /** The composition's children; optional for host-specific shells. */
  readonly children?: ReactNode;
};

/** Props of the DataViews root. A context mount, not a DOM element. */
export type DataViewsProps<TFields extends readonly SchemaFieldDefinition[]> =
  OwnProps<TFields>;
