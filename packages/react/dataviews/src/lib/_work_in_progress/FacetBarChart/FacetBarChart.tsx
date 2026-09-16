import type {
  DisplayStatus,
  RowRecord,
  SchemaFieldDefinition,
} from "@canonical/dataviews-core";
import {
  areDisplayStatusesEqual,
  isDataViewsProvider,
  resolveDisplayStatus,
} from "@canonical/dataviews-core/bindings";
import { type ReactElement, useCallback, useEffect, useId } from "react";
import { MessagesContext, StatusItem } from "../../common/index.js";
import {
  useAnsweredFacets,
  useDataViewsValue,
  useMessages,
  useStableValue,
} from "../../hooks/index.js";
import { describeStatus, isSameFacet } from "../../utils/index.js";
import { BarDrawing } from "./common/index.js";
import type { FacetBarChartProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds facet-bar-chart";

/**
 * A prototype chart of one field's values, each drawn as a bar as long as
 * the number of records holding it: counted by the source over every record
 * matching the query, never over the rows on screen. A count the source gives
 * as a lower bound says "at least"; one it did not count draws no bar.
 *
 * The drawing is an image named for what it shows, and the numbers are in the
 * native table that follows it, so nothing is carried by the drawing alone.
 * While no result answers the query, the core's status is shown in place of
 * the bars, never bars counted for another query. The server draws it from
 * the facets of the page it renders, so it needs no script.
 *
 * Not exported from the package root: a work-in-progress prototype, imported
 * from its own module to find out what a chart needs.
 *
 * @experimental Pre-release: a work-in-progress prototype, not admitted to
 * the package root; its shape may change or it may be withdrawn.
 */
export default function FacetBarChart<
  TFields extends readonly SchemaFieldDefinition[],
  TRow extends object = RowRecord,
>({
  provider,
  field,
  label,
  renderStatus,
  messages,
  className,
  ...rest
}: FacetBarChartProps<TFields, TRow>): ReactElement {
  if (!isDataViewsProvider(provider)) {
    throw new Error(
      "FacetBarChart requires a provider created by createDataViewsProvider",
    );
  }
  if (!provider.capabilities.facets.includes(field)) {
    throw new Error(
      `FacetBarChart names "${field}", which the source does not facet`,
    );
  }
  const words = useMessages(messages);
  useEffect(() => provider.observe(), [provider]);
  const answered = useAnsweredFacets({ provider });
  const state = useDataViewsValue(provider.state);
  const status = useStableValue(
    resolveDisplayStatus(state),
    areDisplayStatusesEqual,
  );
  const captionId = useId();
  // Held at one reference while it claims the same, so a result that moved
  // another field's facet redraws nothing here: the source mints a fresh
  // facet for every request, and the provider keeps the whole record only
  // while every field's facet is unchanged.
  const facet = useStableValue(
    answered === null ? null : answered[field],
    isSameFacet,
  );
  if (facet !== null && facet !== undefined && facet.kind !== "values") {
    throw new Error(`FacetBarChart draws values, and "${field}" is a range`);
  }
  // Three states, read apart: null while no result answers the query, when
  // the figure says only that it is busy; undefined where a result answered
  // without this field's facet, which is said rather than thrown, since the
  // answer carries it and no mounting check could have caught it; and a
  // facet of its own, which may list no value at all.
  const values = facet === null || facet === undefined ? [] : facet.values;
  // The words' own text for a status, unless the caller renders its own.
  const describe = useCallback(
    (shown: DisplayStatus) => describeStatus(shown, words),
    [words],
  );
  const showStatus = renderStatus ?? describe;
  return (
    <MessagesContext value={words}>
      <figure
        {...rest}
        className={[componentCssClassName, className].filter(Boolean).join(" ")}
        aria-labelledby={captionId}
        aria-busy={state.pendingRequestId !== null}
      >
        <figcaption id={captionId}>{label}</figcaption>
        {status === null ? null : (
          <StatusItem status={status} renderStatus={showStatus} />
        )}
        {facet === undefined ? <p>{words.facetCountsAbsent}</p> : null}
        {facet !== null && facet !== undefined && values.length === 0 ? (
          <p>{words.facetValuesNone}</p>
        ) : null}
        {values.length === 0 ? null : (
          <BarDrawing label={label} values={values} />
        )}
      </figure>
    </MessagesContext>
  );
}
