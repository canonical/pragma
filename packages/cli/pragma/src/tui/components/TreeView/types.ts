export interface TreeViewProps {
  /** Tree data to render (array of nodes, or a single rooted tree). */
  readonly data: unknown;
  /** URI prefix map for compacting IRIs. */
  readonly prefixes?: Readonly<Record<string, string>>;
}
