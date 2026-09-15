import type {
  DataViewsState,
  FieldKind,
  FilterHandles,
  PredicateOperand,
  PredicateOperator,
  Query,
  SchemaFieldDefinition,
  SourceCapabilities,
} from "@canonical/dataviews-core";
import {
  type ProviderHost,
  readProviderHost,
} from "@canonical/dataviews-core/bindings";
import { Button } from "@canonical/react-ds-global";
import { Fragment, type ReactElement, useRef } from "react";
import { interceptSubmit } from "../../../../utils/index.js";
import {
  type UseFacetsResult,
  useDataViewsRoot,
  useFacets,
} from "../../hooks/index.js";
import { HiddenQueryFields } from "../HiddenQueryFields/index.js";
import { findFilterHandle } from "../utils/index.js";
import {
  BoundFilter,
  ChoicesFilter,
  FlagFilter,
  TextFilter,
} from "./common/index.js";
import type { DataViewsFiltersProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds data-views-filters";

/** The controls submit every filter themselves; nothing else is theirs. */
const NO_OWN_KEYS: readonly string[] = [];

/**
 * The destination a submission reaches: the applied query less every
 * filter, which the controls submit themselves, from the first page, as a
 * filter command would leave it.
 */
const destinationOf = ({ slice, window }: DataViewsState<object>): Query => ({
  slice: { ...slice, filter: [] },
  window: { ...window, page: 1, cursor: null },
});

/**
 * What every control is built against: the root's records, what its source
 * declares, and where focus goes when a control leaves with the restriction
 * it removed, or disables the control that had it.
 */
type FilterContext = {
  readonly filters: FilterHandles<readonly SchemaFieldDefinition[]>;
  readonly capabilities: SourceCapabilities;
  readonly host: ProviderHost;
  /** The facets answering the applied query, or null while none does. */
  readonly facets: UseFacetsResult;
  readonly focusGroup: () => void;
};

/** Whether the source executes one operator over one field. */
const declares = (
  { capabilities }: FilterContext,
  field: string,
  operator: PredicateOperator,
): boolean => capabilities.filter[field]?.includes(operator) === true;

/** The two bound controls a ranged kind edits through. */
const renderBounds = (
  context: FilterContext,
  definition: Extract<
    SchemaFieldDefinition,
    { readonly kind: "number" | "date" }
  >,
  name: string,
): ReactElement => {
  const facet = context.facets?.[definition.field];
  return (
    <Fragment key={definition.field}>
      {(["gte", "lte"] as const).map((bound) => (
        <BoundFilter
          key={bound}
          handle={findFilterHandle<number | string>(
            context.filters,
            definition.field,
            bound,
          )}
          label={name}
          bound={bound}
          definition={definition}
          range={facet?.kind === "range" ? facet : null}
          declared={declares(context, definition.field, bound)}
          onLeave={context.focusGroup}
        />
      ))}
    </Fragment>
  );
};

/**
 * The control each field kind edits through, keyed by kind so a kind the
 * schema gains is a compile error here until its control exists.
 */
const controls: {
  readonly [TKind in FieldKind]: (
    context: FilterContext,
    definition: Extract<SchemaFieldDefinition, { readonly kind: TKind }>,
    name: string,
  ) => ReactElement | null;
} = {
  choices: (context, definition, name) => {
    const facet = context.facets?.[definition.field];
    const values = facet?.kind === "values" ? facet.values : null;
    const declaresAny = declares(context, definition.field, "isAny");
    return (
      <Fragment key={definition.field}>
        {(["isAny", "isNone"] as const).map((operator) => {
          const other = operator === "isAny" ? "isNone" : "isAny";
          const declared = declares(context, definition.field, operator);
          return (
            <ChoicesFilter
              key={operator}
              options={definition.options}
              values={values}
              handle={findFilterHandle<ReadonlySet<PredicateOperand>>(
                context.filters,
                definition.field,
                operator,
              )}
              operator={operator}
              alternative={
                declares(context, definition.field, other) ? other : null
              }
              alternativeHandle={findFilterHandle<
                ReadonlySet<PredicateOperand>
              >(context.filters, definition.field, other)}
              host={context.host}
              label={name}
              field={definition.field}
              declared={declared}
              // None-of is reached from a standing any-of set wherever
              // any-of is declared, and offered on its own only where not.
              offered={declared && (operator === "isAny" || !declaresAny)}
              onLeave={context.focusGroup}
            />
          );
        })}
      </Fragment>
    );
  },
  flag: (context, definition, name) => (
    <FlagFilter
      key={definition.field}
      handle={findFilterHandle<boolean>(
        context.filters,
        definition.field,
        "isSet",
      )}
      label={name}
      field={definition.field}
      declared={declares(context, definition.field, "isSet")}
      onLeave={context.focusGroup}
    />
  ),
  number: renderBounds,
  date: renderBounds,
  text: (context, definition, name) => (
    <Fragment key={definition.field}>
      {(["contains", "startsWith"] as const).map((operator) => (
        <TextFilter
          key={operator}
          handle={findFilterHandle<string>(
            context.filters,
            definition.field,
            operator,
          )}
          operator={operator}
          label={name}
          field={definition.field}
          declared={declares(context, definition.field, operator)}
          onLeave={context.focusGroup}
        />
      ))}
    </Fragment>
  ),
};

/** One field's control, through the row its kind selects. */
const renderControl = (
  context: FilterContext,
  definition: SchemaFieldDefinition,
  name: string,
): ReactElement | null => {
  // Narrowed by the same discriminant the record is keyed by.
  const control = controls[definition.kind] as (
    context: FilterContext,
    definition: SchemaFieldDefinition,
    name: string,
  ) => ReactElement | null;
  return control(context, definition, name);
};

/**
 * The collection's query-editing controls.
 *
 * Which fields are on offer and which operators each accepts come from the
 * provider — its collection's schema, and what its source declares it can
 * execute — not from props: a restriction the source would refuse is never
 * offered, and there is no second query to keep in step with the applied
 * one. Edits go straight to the applied query through the root's own
 * filter records — an invalid, incomplete or refused edit keeps the
 * restriction that is already in force and says so beside the control, and
 * two roots over one provider never share a half-typed input.
 *
 * Where the provider asks its source for facets, the controls read them:
 * counts beside a choice's options, the server's options where the schema
 * lists none, and the least and greatest value beside a number or date
 * bound — each computed by the source over the whole matching set, and
 * shown only while the result answers the applied query.
 *
 * At baseline the controls are a GET form: each is named as the wire
 * grammar spells its clause, a number bound is a native number input with
 * the schema's bounds, the text a field must contain or start with is a
 * native text input, a set standing any-of or none-of moves to the other by
 * a real link, hidden controls carry the rest of the query, and the submit
 * control leads to the destination the provider would have written. Once
 * scripting is enabled every edit applies as it is made, the clear controls
 * appear, and a submission is intercepted.
 *
 * `import { DataViews } from "@canonical/dataviews-react";`
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export default function Filters({
  label = "Filters",
  labels,
  className,
  ...rest
}: DataViewsFiltersProps): ReactElement {
  const { provider, filters } = useDataViewsRoot("Filters");
  const facets = useFacets({ provider });
  const groupRef = useRef<HTMLFieldSetElement>(null);
  const context: FilterContext = {
    filters,
    capabilities: provider.capabilities,
    host: readProviderHost(provider),
    facets,
    focusGroup: () => {
      groupRef.current?.focus();
    },
  };
  return (
    <form
      {...rest}
      method="get"
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      onSubmit={interceptSubmit}
    >
      {/* Focusable from code, never by Tab: where focus goes when a control
          that had it leaves with the restriction it removed, or is
          disabled. */}
      <fieldset ref={groupRef} className="group" tabIndex={-1}>
        <legend className="legend">{label}</legend>
        {provider.collection.schema.fields.map((definition) =>
          renderControl(
            context,
            definition,
            labels?.[definition.field] ?? definition.field,
          ),
        )}
      </fieldset>
      <HiddenQueryFields
        provider={provider}
        destinationOf={destinationOf}
        omit={NO_OWN_KEYS}
      />
      <Button type="submit" importance="secondary" className="submit">
        Apply filters
      </Button>
    </form>
  );
}
