import type { ColumnDef } from "../../../domains/shared/contracts.js";

export interface ListViewProps<T> {
  /** Heading text displayed above the table (e.g., "Blocks"). */
  readonly heading: string;
  /** Domain name — indexes into DOMAIN_COLORS for heading and row coloring. */
  readonly domain: string;
  /** Data items to render as table rows. */
  readonly items: readonly T[];
  /** Column definitions controlling which fields appear and how they format. */
  readonly columns: readonly ColumnDef<T>[];
  /** URI prefix map for compacting IRIs. */
  readonly prefixes?: Readonly<Record<string, string>>;
}
