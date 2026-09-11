/** How `virtualRows` windows a table's rows. */
export type VirtualRowsOptions = {
  /**
   * The height a row is placed at until it is measured, in pixels. An
   * estimate, never a clip: a taller row grows, and the table measures it.
   */
  readonly estimatedRowHeight: number;
};
