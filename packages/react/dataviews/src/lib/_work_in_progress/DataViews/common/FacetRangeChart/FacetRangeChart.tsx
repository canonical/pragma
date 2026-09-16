import type { ReactElement } from "react";
import { FacetRangeChart as Standalone } from "../../../FacetRangeChart/index.js";
import { useDataViewsRoot } from "../../hooks/index.js";
import type { DataViewsFacetRangeChartProps } from "./types.js";

/**
 * The chart, bound to the enclosing root's provider: it draws exactly what
 * the standalone `FacetRangeChart` draws for that provider, reading the root
 * it is placed in and throwing outside one, and taking the root's words
 * rather than resolving its own. So a chart beside the root's filters redraws
 * as they narrow the query.
 *
 * Not exported from the package root, nor placed on `DataViews`: a
 * work-in-progress prototype, imported from its own module.
 *
 * @experimental Pre-release: a work-in-progress prototype, not admitted to
 * the package root; its shape may change or it may be withdrawn.
 */
export default function FacetRangeChart(
  props: DataViewsFacetRangeChartProps,
): ReactElement {
  const { provider, messages } = useDataViewsRoot("FacetRangeChart");
  return <Standalone {...props} provider={provider} messages={messages} />;
}
