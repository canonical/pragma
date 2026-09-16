import type { SchemaFieldDefinition } from "@canonical/dataviews-core";
import type { PaginationBarProps } from "../../../PaginationBar/index.js";

/**
 * Props of the connected pagination part: the pagination bar's, less what
 * the enclosing root supplies — the provider, and the words its parts speak.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type DataViewsPaginationProps = Omit<
  PaginationBarProps<readonly SchemaFieldDefinition[]>,
  "provider" | "messages"
>;
