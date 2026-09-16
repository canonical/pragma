import type { Facet } from "@canonical/dataviews-core";

/** One value of a values facet, with the count of records holding it. */
export type DrawnValue = Extract<
  Facet,
  { readonly kind: "values" }
>["values"][number];

/**
 * Props of the bar drawing.
 *
 * Exempt from the native-prop extension convention: an internal renderer
 * drawing its figure from the facet, not forwarding a caller's native props.
 */
export type BarDrawingProps = {
  /** The chart's label, which captions the table and names the drawing. */
  readonly label: string;
  /** The values drawn, in the source's order; never empty. */
  readonly values: readonly DrawnValue[];
};
