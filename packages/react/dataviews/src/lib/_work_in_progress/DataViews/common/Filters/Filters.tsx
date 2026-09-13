import type {
  DataViewsProvider,
  FieldKind,
  PredicateOperand,
  PredicateOperator,
  SchemaFieldDefinition,
  SourceCapabilities,
} from "@canonical/dataviews-core";
import { Fragment, type ReactElement } from "react";
import { useDataViewsRoot } from "../../hooks/index.js";
import { BoundFilter, ChoicesFilter, FlagFilter } from "./common/index.js";
import findHandle from "./findHandle.js";
import type { DataViewsFiltersProps } from "./types.js";

const componentCssClassName = "ds data-views-filters";

/** What every control is built against: the root's provider and what its source declares. */
type FilterContext = {
  readonly provider: DataViewsProvider<readonly SchemaFieldDefinition[]>;
  readonly capabilities: SourceCapabilities;
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
): ReactElement => (
  <Fragment key={definition.field}>
    {(["gte", "lte"] as const).map((bound) => (
      <BoundFilter
        key={bound}
        handle={findHandle<number | string>(
          context.provider,
          definition.field,
          bound,
        )}
        label={name}
        bound={bound}
        kind={definition.kind}
        declared={declares(context, definition.field, bound)}
      />
    ))}
  </Fragment>
);

/**
 * The control each field kind edits through, keyed by kind so a kind the
 * schema gains is a compile error here until its control exists. Text is
 * ordered, never filtered, so it has none.
 */
const controls: {
  readonly [TKind in FieldKind]: (
    context: FilterContext,
    definition: Extract<SchemaFieldDefinition, { readonly kind: TKind }>,
    name: string,
  ) => ReactElement | null;
} = {
  choices: (context, definition, name) => (
    <ChoicesFilter
      key={definition.field}
      options={definition.options}
      handle={findHandle<ReadonlySet<PredicateOperand>>(
        context.provider,
        definition.field,
        "eq",
      )}
      label={name}
      declared={declares(context, definition.field, "eq")}
    />
  ),
  flag: (context, definition, name) => (
    <FlagFilter
      key={definition.field}
      handle={findHandle<boolean>(context.provider, definition.field, "isSet")}
      label={name}
      declared={declares(context, definition.field, "isSet")}
    />
  ),
  number: renderBounds,
  date: renderBounds,
  text: () => null,
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
 * provider — its schema, and what its source declares it can execute — not
 * from props: a restriction the source would refuse is never offered, and
 * there is no second query to keep in step with the applied one. Edits go
 * straight to the applied query — an invalid or incomplete edit keeps the
 * restriction that is already in force and says so beside the control.
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
  const provider = useDataViewsRoot("Filters");
  const { capabilities } = provider;
  if (capabilities === null) {
    throw new Error(
      "DataViews.Filters requires a provider given the source's capabilities; pass them to createDataViewsProvider",
    );
  }
  const context: FilterContext = { provider, capabilities };
  return (
    <fieldset
      {...rest}
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
    >
      <legend className="legend">{label}</legend>
      {provider.schema.fields.map((definition) =>
        renderControl(
          context,
          definition,
          labels?.[definition.field] ?? definition.field,
        ),
      )}
    </fieldset>
  );
}
