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
import { RangeDrawing } from "./common/index.js";
import type { FacetRangeChartProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds facet-range-chart";

/**
 * A prototype chart of one number field's range over the records matching
 * the query: the lowest and highest values any of them holds, measured by the
 * source over every matching record, never over the rows on screen, drawn as
 * a band on a labelled axis. The axis reaches the field's declared bounds
 * where the schema gives them, and round numbers past the range otherwise.
 *
 * The drawing is an image named with the range it shows, and both values are
 * in the native table that follows it. While no result answers the query, the
 * core's status is shown in place of the range. The server draws it from the
 * facets of the page it renders, so it needs no script.
 *
 * Not exported from the package root: a work-in-progress prototype, imported
 * from its own module to find out what a chart needs.
 *
 * @experimental Pre-release: a work-in-progress prototype, not admitted to
 * the package root; its shape may change or it may be withdrawn.
 */
export default function FacetRangeChart<
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
}: FacetRangeChartProps<TFields, TRow>): ReactElement {
  if (!isDataViewsProvider(provider)) {
    throw new Error(
      "FacetRangeChart requires a provider created by createDataViewsProvider",
    );
  }
  const definition = provider.collection.schema.fields.find(
    (declared) => declared.field === field,
  );
  if (definition?.kind !== "number") {
    throw new Error(
      `FacetRangeChart draws a number field, and "${field}" is not one`,
    );
  }
  if (!provider.capabilities.facets.includes(field)) {
    throw new Error(
      `FacetRangeChart names "${field}", which the source does not facet`,
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
  // another field's facet redraws nothing here.
  const facet = useStableValue(
    answered === null ? null : answered[field],
    isSameFacet,
  );
  if (facet !== null && facet !== undefined && facet.kind !== "range") {
    throw new Error(
      `FacetRangeChart draws a range, and "${field}" holds values`,
    );
  }
  // Three states, read apart: null while no result answers the query, when
  // the figure says only that it is busy; undefined where a result answered
  // without this field's facet, which is said rather than thrown, since the
  // answer carries it and no mounting check could have caught it; and a
  // facet of its own, whose range may have no ends at all.
  // Ends that are numbers and finite: a range of NaN or of infinities has
  // no length to scale against, so it says what a range of nothing says
  // rather than drawing an axis no coordinate lands on.
  const range =
    facet !== null &&
    facet !== undefined &&
    Number.isFinite(facet.min) &&
    Number.isFinite(facet.max)
      ? { min: facet.min as number, max: facet.max as number }
      : null;
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
        {facet === undefined ? <p>{words.facetRangeAbsent}</p> : null}
        {facet === null || facet === undefined ? null : range === null ? (
          <p>{words.facetValuesNone}</p>
        ) : (
          <RangeDrawing
            label={label}
            min={range.min}
            max={range.max}
            lowerBound={definition.min}
            upperBound={definition.max}
          />
        )}
      </figure>
    </MessagesContext>
  );
}
