import type { SchemaFieldDefinition } from "@canonical/dataviews-core";
import type { PaginationBarProps } from "../../../PaginationBar/index.js";

/**
 * Props of the connected pagination part: the pagination bar's, less the
 * provider, which comes from the enclosing root.
 */
export type DataViewsPaginationProps = Omit<
  PaginationBarProps<readonly SchemaFieldDefinition[]>,
  "provider"
>;
