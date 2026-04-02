export interface MiniTableProps {
  /** Array of objects to render as rows. Each object's entries become columns. */
  readonly data: readonly Record<string, unknown>[];
  /** URI prefix map for compacting IRIs. */
  readonly prefixes?: Readonly<Record<string, string>>;
}
