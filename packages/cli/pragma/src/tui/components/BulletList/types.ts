export interface BulletListProps {
  /** Items to render as a bulleted list. */
  readonly items: readonly unknown[];
  /** URI prefix map for compacting IRIs. */
  readonly prefixes?: Readonly<Record<string, string>>;
}
