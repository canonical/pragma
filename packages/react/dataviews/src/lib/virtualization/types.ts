/**
 * How `virtualizeRows` windows a table's rows.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type VirtualRowsConfig = {
  /**
   * The height a row is placed at until it is measured, in pixels. An
   * estimate, never a clip: a taller row grows, and the table measures it.
   */
  readonly estimatedRowHeight: number;
};
