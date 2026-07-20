export interface OntologyGraphProps {
  /**
   * Optional focus entity id. When set, only that entity's neighbourhood is
   * loaded; when omitted, the whole graph is returned.
   */
  focus?: string | null;
  /** Height of the canvas; forwarded to `GraphCanvas`. Defaults to `480`. */
  height?: number | string;
  /** Show the legend panel. Defaults to `true`. */
  showLegend?: boolean;
  /** Additional CSS classes for the canvas wrapper. */
  className?: string;
}
