import type { SchemaFieldDefinition } from "@canonical/dataviews-core";
import type { PaginationBarProps } from "../../../PaginationBar/types.js";

/**
 * Props of the connected pagination part: the pagination bar's, less the
 * provider, which comes from the enclosing root.
 */
export type PaginationProps = Omit<
  PaginationBarProps<readonly SchemaFieldDefinition[]>,
  "provider"
>;
