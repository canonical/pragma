/**
 * Props of the range drawing.
 *
 * Exempt from the native-prop extension convention: an internal renderer
 * drawing its figure from the facet, not forwarding a caller's native props.
 */
export type RangeDrawingProps = {
  /** The chart's label, which captions the table and names the drawing. */
  readonly label: string;
  /** The least value any matching record holds. */
  readonly min: number;
  /** The greatest value any matching record holds. */
  readonly max: number;
  /** The field's declared least value, where the schema declares one. */
  readonly lowerBound: number | undefined;
  /** The field's declared greatest value, where the schema declares one. */
  readonly upperBound: number | undefined;
};
