import type { SchemaFieldDefinition } from "@canonical/dataviews-core";
import type { FacetRangeChartProps } from "../../../FacetRangeChart/index.js";

/**
 * Props of the connected chart: the chart's own, less the provider and the
 * words, which come from the enclosing root.
 *
 * @experimental Pre-release: a work-in-progress prototype, not admitted to
 * the package root; its shape may change or it may be withdrawn.
 */
export type DataViewsFacetRangeChartProps = Omit<
  FacetRangeChartProps<readonly SchemaFieldDefinition[]>,
  "provider" | "messages"
>;
