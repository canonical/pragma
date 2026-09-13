import type {
  PredicateOperand,
  PredicateOperator,
} from "@canonical/dataviews-core";
import type { ReactElement } from "react";
import { Fragment, useContext } from "react";
import DataViewsContext from "../../Context.js";
import { BoundFilter, ChoicesFilter, FlagFilter } from "./common/index.js";
import handleFor from "./handleFor.js";
import type { DataViewsFiltersProps } from "./types.js";

const componentCssClassName = "ds data-views-filters";

/**
 * The collection's query-editing controls.
 *
 * Which fields are on offer and which operators each accepts come from the
 * provider — its schema, and what its source declares it can execute — not
 * from props: a restriction the source would refuse is never offered, and
 * there is no second query to keep in step with the applied one. Edits go
 * straight to the applied query — an invalid or incomplete edit keeps the
 * restriction that is already in force and says so beside the control.
 */
export default function Filters({
  label = "Filters",
  labels,
  className,
  ...rest
}: DataViewsFiltersProps): ReactElement {
  const provider = useContext(DataViewsContext);
  if (provider === null) {
    throw new Error("DataViews.Filters must be used inside a DataViews root");
  }
  const { capabilities } = provider;
  if (capabilities === null) {
    throw new Error(
      "DataViews.Filters requires a provider given the source's capabilities; pass them to createDataViewsProvider",
    );
  }
  const declares = (field: string, operator: PredicateOperator): boolean =>
    capabilities.filter[field]?.includes(operator) === true;
  return (
    <fieldset
      {...rest}
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
    >
      <legend className="legend">{label}</legend>
      {provider.schema.fields.map((definition) => {
        if (definition.kind === "text") {
          // Text is ordered, never filtered.
          return null;
        }
        const { field } = definition;
        const name = labels?.[field] ?? field;
        if (definition.kind === "choices") {
          return (
            <ChoicesFilter
              key={field}
              options={definition.options}
              handle={handleFor<ReadonlySet<PredicateOperand>>(
                provider,
                field,
                "eq",
              )}
              label={name}
              declared={declares(field, "eq")}
            />
          );
        }
        if (definition.kind === "flag") {
          return (
            <FlagFilter
              key={field}
              handle={handleFor<boolean>(provider, field, "isSet")}
              label={name}
              declared={declares(field, "isSet")}
            />
          );
        }
        return (
          <Fragment key={field}>
            <BoundFilter
              handle={handleFor<number | string>(provider, field, "gte")}
              label={name}
              bound="gte"
              kind={definition.kind}
              declared={declares(field, "gte")}
            />
            <BoundFilter
              handle={handleFor<number | string>(provider, field, "lte")}
              label={name}
              bound="lte"
              kind={definition.kind}
              declared={declares(field, "lte")}
            />
          </Fragment>
        );
      })}
    </fieldset>
  );
}
