import type {
  DataViewsState,
  FieldKind,
  FilterHandles,
  PredicateOperand,
  PredicateOperator,
  Query,
  SchemaFieldDefinition,
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
  useMoreFiltersPin,
  useRestrictedFields,
} from "../../hooks/index.js";
import { HiddenQueryFields } from "../HiddenQueryFields/index.js";
import { findFilterHandle } from "../utils/index.js";
import { NO_RECORDS } from "./common/constants.js";
import {
  BoundFilter,
  ChoicesFilter,
  FlagFilter,
  TextFilter,
} from "./common/index.js";
import { listFacetOptions } from "./common/utils/index.js";
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
 * What every control is built against: the root's records, the provider's
 * host and what its source declares, the facets its controls show and the
 * server's options they list, and where focus goes when a control leaves
 * with the restriction it removed, or disables the control that had it.
 */
type FilterContext = {
  /** The root's filter records, one per field and legal operator. */
  readonly filters: FilterHandles<readonly SchemaFieldDefinition[]>;
  /** The provider's host: what its source declares, and the query commands. */
  readonly host: ProviderHost;
  /** The facets answering the applied query, or null while none does. */
  readonly answered: UseFacetsResult["answered"];
  /** The server's options for a field, as the latest facet lists them. */
  readonly listServerOptions: (field: string) => readonly string[];
  /** Whether a field's control moves elsewhere once its last restriction is cleared. */
  readonly isShownOnlyWhileRestricted: (field: string) => boolean;
  /** Move focus to the filters' group, where a leaving control hands it. */
  readonly focusGroup: () => void;
};

/** Whether the source executes one operator over one field. */
const declares = (
  context: FilterContext,
  field: string,
  operator: PredicateOperator,
): boolean =>
  context.host.capabilities.filter[field]?.includes(operator) === true;

/**
 * Whether a control leaves once the restriction it clears was the field's
 * last: undeclared, or shown only because its field is restricted.
 */
const leavesWhenCleared = (
  context: FilterContext,
  field: string,
  operator: PredicateOperator,
): boolean =>
  !declares(context, field, operator) ||
  context.isShownOnlyWhileRestricted(field);

/** The two bound controls a ranged kind edits through. */
const renderBounds = (
  context: FilterContext,
  definition: Extract<
    SchemaFieldDefinition,
    { readonly kind: "number" | "date" }
  >,
  name: string,
): ReactElement => {
  const facet = context.answered?.[definition.field];
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
          offered={
            facet?.kind === "range"
              ? facet[bound === "gte" ? "min" : "max"]
              : null
          }
          declared={declares(context, definition.field, bound)}
          leavesWhenCleared={leavesWhenCleared(
            context,
            definition.field,
            bound,
          )}
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
    const answered = context.answered?.[definition.field];
    // Read once for both sets: the counts, and the server's options. A
    // declared option is counted only from the value it is, by type as a
    // set matches it; the server's options are text, counted by their text.
    const { options: declaredOptions } = definition;
    const counts =
      answered?.kind === "values"
        ? new Map(
            answered.values
              .filter(
                ({ value }) =>
                  declaredOptions === undefined ||
                  (value !== true && declaredOptions.includes(value)),
              )
              .map(({ value, count }) => [String(value), count]),
          )
        : null;
    const options =
      definition.options ?? context.listServerOptions(definition.field);
    return (
      <Fragment key={definition.field}>
        {(["isAny", "isNone"] as const).map((operator) => {
          const alternative = operator === "isAny" ? "isNone" : "isAny";
          return (
            <ChoicesFilter
              key={operator}
              options={options}
              serverOwned={definition.options === undefined}
              counts={counts}
              handle={findFilterHandle<ReadonlySet<PredicateOperand>>(
                context.filters,
                definition.field,
                operator,
              )}
              operator={operator}
              alternativeDeclared={declares(
                context,
                definition.field,
                alternative,
              )}
              alternativeHandle={findFilterHandle<
                ReadonlySet<PredicateOperand>
              >(context.filters, definition.field, alternative)}
              host={context.host}
              label={name}
              field={definition.field}
              declared={declares(context, definition.field, operator)}
              leavesWhenCleared={leavesWhenCleared(
                context,
                definition.field,
                operator,
              )}
              onLeave={context.focusGroup}
            />
          );
        })}
      </Fragment>
    );
  },
  flag: (context, definition, name) => {
    const facet = context.answered?.[definition.field];
    return (
      <FlagFilter
        key={definition.field}
        handle={findFilterHandle<boolean>(
          context.filters,
          definition.field,
          "isSet",
        )}
        // A facet that lists no record setting the field counts none.
        count={
          facet?.kind === "values"
            ? (facet.values.find(({ value }) => value === true)?.count ??
              NO_RECORDS)
            : null
        }
        label={name}
        field={definition.field}
        declared={declares(context, definition.field, "isSet")}
        leavesWhenCleared={leavesWhenCleared(
          context,
          definition.field,
          "isSet",
        )}
        onLeave={context.focusGroup}
      />
    );
  },
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
          leavesWhenCleared={leavesWhenCleared(
            context,
            definition.field,
            operator,
          )}
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
 * counts beside a choice's options and beside a flag, the least and greatest
 * value beside a number or date bound, and the server's options where the
 * schema lists none — each computed by the source over the whole matching
 * set. Counts and ranges are shown only while the result answers the applied
 * query; the server's options stay from the latest result until a newer one
 * lists others.
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
 * With `primary` fields marked, the controls shown by default are theirs, in
 * the order marked, then any other field's that carries a restriction; the
 * rest are a native disclosure, "More filters", which needs no script and
 * whose controls submit with the form. While the disclosure is open no
 * control moves in or out of it, so a control keeps focus while its field
 * gains or loses a restriction; closing it brings out what was restricted
 * inside.
 *
 * `import { DataViews } from "@canonical/dataviews-react";`
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export default function Filters({
  label = "Filters",
  labels,
  primary,
  className,
  ...rest
}: DataViewsFiltersProps): ReactElement {
  const { provider, filters } = useDataViewsRoot("Filters");
  const facets = useFacets({ provider });
  const restricted = useRestrictedFields({ provider });
  const groupRef = useRef<HTMLFieldSetElement>(null);
  const { schema } = provider.collection;
  const marked = primary ?? [];
  // Each mark read once: a field the collection lacks is refused, and the
  // rest are the primary controls, in the order marked.
  const primaryFields: SchemaFieldDefinition[] = [];
  for (const field of marked) {
    const definition = schema.findField(field);
    if (definition === undefined) {
      throw new Error(`the schema has no field "${field}" to mark primary`);
    }
    primaryFields.push(definition);
  }
  const hasPrimary = marked.length > 0;
  const marks = marked.join("\u0000");
  /** Whether a field's control shows by default as things stand now. */
  const isShown = (field: string): boolean =>
    marked.includes(field) || restricted.has(field);
  const { pinned, detailsRef, handleToggle } = useMoreFiltersPin({
    marks,
    listShownFields: () =>
      schema.fields.map(({ field }) => field).filter((field) => isShown(field)),
  });
  const isOutside = (field: string): boolean =>
    !hasPrimary || (pinned === null ? isShown(field) : pinned.has(field));
  // Each field's server options listed once a render, for its placement and
  // its control alike.
  const listedServerOptions = new Map<string, readonly string[]>();
  const listServerOptions = (field: string): readonly string[] => {
    const listed = listedServerOptions.get(field);
    if (listed !== undefined) {
      return listed;
    }
    const read = listFacetOptions(facets.latest?.[field]);
    listedServerOptions.set(field, read);
    return read;
  };
  const context: FilterContext = {
    filters,
    host: readProviderHost(provider),
    answered: facets.answered,
    listServerOptions,
    isShownOnlyWhileRestricted: (field) =>
      hasPrimary &&
      pinned === null &&
      !marked.includes(field) &&
      restricted.get(field) === 1,
    focusGroup: () => {
      groupRef.current?.focus();
    },
  };
  const renderField = (definition: SchemaFieldDefinition) =>
    renderControl(
      context,
      definition,
      labels?.[definition.field] ?? definition.field,
    );
  const outside = [
    ...primaryFields,
    ...schema.fields.filter(
      (definition) =>
        !marked.includes(definition.field) && isOutside(definition.field),
    ),
  ];
  /**
   * Whether a field has a control to place: a restricted field always does,
   * so a restriction beyond what its source declares is never hidden; a
   * declared field does, unless its options are the server's and nothing
   * lists them yet.
   */
  const hasControl = (definition: SchemaFieldDefinition): boolean => {
    if (restricted.has(definition.field)) {
      return true;
    }
    if (!Object.hasOwn(context.host.capabilities.filter, definition.field)) {
      return false;
    }
    // Listed from the latest facet, as the control lists them.
    return !(
      definition.kind === "choices" &&
      definition.options === undefined &&
      listServerOptions(definition.field).length === 0
    );
  };
  const inside = schema.fields.filter(
    (definition) =>
      !marked.includes(definition.field) &&
      !isOutside(definition.field) &&
      hasControl(definition),
  );
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
        {(hasPrimary ? outside : schema.fields).map(renderField)}
        {/* Open while pinned, and kept while pinned though nothing is left
            inside: the pin is the disclosure's own state, and must never
            outlive it. A reader may open it before scripts take over, so its
            open state may differ from the server's without a mismatch. */}
        {hasPrimary && (inside.length > 0 || pinned !== null) ? (
          <details
            ref={detailsRef}
            suppressHydrationWarning
            className="more"
            open={pinned !== null}
            onToggle={handleToggle}
          >
            <summary className="summary">More filters</summary>
            {inside.map(renderField)}
          </details>
        ) : null}
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
