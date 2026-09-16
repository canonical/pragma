import type { SchemaFieldDefinition } from "@canonical/dataviews-core";
import type { FacetBarChartProps } from "../../../FacetBarChart/index.js";

/**
 * Props of the connected chart: the chart's own, less the provider and the
 * words, which come from the enclosing root.
 *
 * @experimental Pre-release: a work-in-progress prototype, not admitted to
 * the package root; its shape may change or it may be withdrawn.
 */
export type DataViewsFacetBarChartProps = Omit<
  FacetBarChartProps<readonly SchemaFieldDefinition[]>,
  "provider" | "messages"
>;
