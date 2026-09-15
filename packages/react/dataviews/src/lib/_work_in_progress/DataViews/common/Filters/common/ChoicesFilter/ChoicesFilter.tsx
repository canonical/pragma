import type { Count, PredicateOperand, Query } from "@canonical/dataviews-core";
import { spellWireKey } from "@canonical/dataviews-core/bindings";
import { Button } from "@canonical/react-ds-global";
import { type ReactElement, useId } from "react";
import { useIsHydrated } from "../../../../../../hooks/index.js";
import { useFilterHandle } from "../../../../hooks/index.js";
import type { ChoicesFilterProps } from "./types.js";

const componentCssClassName = "ds data-views-filters-choices";

const NONE_SELECTED: ReadonlySet<PredicateOperand> = new Set();

/** What each set operator adds to the field's name in the legend. */
const LEGEND_WORDING = { isAny: "", isNone: " is none of" } as const;

/** What the control moving a set to each operator says. */
const SWITCH_WORDING = {
  isAny: "Match any of these instead",
  isNone: "Match none of these instead",
} as const;

/**
 * A count as it is shown beside its option: exact, a lower bound, or
 * nothing where the source counted nothing.
 */
const spellCount = (count: Count): string | null => {
  switch (count.kind) {
    case "exact":
      return String(count.value);
    case "at-least":
      return `${count.value}+`;
    case "unknown":
      return null;
  }
};

/**
 * One closed-set filter: a checkbox per option, so the applied set is
 * visible and reachable without opening anything. Membership is the whole
 * state — the last option cleared removes the predicate rather than
 * applying an empty restriction that matches nothing. Every checkbox is
 * named as the wire spells the set — the field for any-of, `<field>__isNone`
 * for none-of — so a GET submission repeats it once per chosen option.
 * Unchecking an option of an undeclared set disables its checkbox, or
 * removes the control with the last, so focus moves to the filters' group.
 *
 * The options are the schema's, or, where the options are the server's, the
 * values the source's facet lists with any the set already holds. Beside
 * each option is how many matching records hold it, from the facet, which
 * the source computes over the whole matching set with this field's own
 * restriction lifted; the count describes its checkbox rather than naming
 * it, and is absent while no facet answers the applied query.
 *
 * While a set stands, the source declares the other set operator on the
 * field and nothing stands under it, the set can move there: a real link
 * before any script runs, and a button once it does, which moves it as one
 * transition.
 */
export default function ChoicesFilter({
  options,
  values,
  handle,
  operator,
  alternative,
  alternativeHandle,
  host,
  label,
  field: fieldName,
  declared,
  offered,
  onLeave,
}: ChoicesFilterProps): ReactElement | null {
  const field = useFilterHandle(handle);
  const other = useFilterHandle(alternativeHandle);
  const hydrated = useIsHydrated();
  const baseId = useId();
  const standing = field.applied.kind === "value";
  const selected = standing ? field.applied.value : NONE_SELECTED;
  // The server's options are what its facet lists, and any the set holds
  // that the facet does not, so a restriction in force is never hidden.
  const listed =
    options ??
    [...(values ?? []).map(({ value }) => value), ...selected].filter(
      (value, place, all): value is string | number =>
        (typeof value === "string" || typeof value === "number") &&
        all.indexOf(value) === place,
    );
  if ((!offered && !standing) || listed.length === 0) {
    return null;
  }
  const counts =
    values === null
      ? null
      : new Map(values.map(({ value, count }) => [String(value), count]));
  /** The query a set moved to the alternative leads to, from the first page. */
  const spellMove = (to: "isAny" | "isNone"): string | null => {
    const { slice, window } = host.state.get();
    const moved: Query = {
      slice: {
        ...slice,
        filter: [
          ...slice.filter.filter(
            (predicate) =>
              predicate.field !== fieldName ||
              (predicate.operator !== operator && predicate.operator !== to),
          ),
          { field: fieldName, operator: to, operands: [...selected] },
        ],
      },
      window: { ...window, page: 1, cursor: null },
    };
    const params = host.spellQuery(moved);
    return params === null ? null : `?${params}`;
  };
  const renderSwitch = (): ReactElement | null => {
    // A set moves only onto an empty one: moving onto a standing set would
    // overwrite a restriction in force.
    if (alternative === null || !standing || other.applied.kind === "value") {
      return null;
    }
    const text = SWITCH_WORDING[alternative];
    if (hydrated) {
      return (
        <Button
          type="button"
          importance="tertiary"
          className="switch"
          onClick={() => {
            host.setPredicate(
              {
                field: fieldName,
                operator: alternative,
                operands: [...selected],
              },
              operator,
            );
            // The control leaves with the set it moved.
            onLeave();
          }}
        >
          {text}
        </Button>
      );
    }
    const destination = spellMove(alternative);
    return destination === null ? null : (
      <a className="switch" href={destination}>
        {text}
      </a>
    );
  };
  return (
    <fieldset className={componentCssClassName}>
      <legend className="legend">{`${label}${LEGEND_WORDING[operator]}`}</legend>
      {listed.map((option, place) => {
        const countId = `${baseId}-count-${place}`;
        // A facet that lists no record holding an option counts none.
        const count =
          counts === null
            ? null
            : spellCount(
                counts.get(String(option)) ?? { kind: "exact", value: 0 },
              );
        return (
          <div key={String(option)} className="option">
            <label>
              <input
                type="checkbox"
                name={spellWireKey(fieldName, operator)}
                value={String(option)}
                checked={selected.has(option)}
                // Undeclared, the set may only shrink: adding an option would
                // be a restriction the source never offered.
                disabled={!declared && !selected.has(option)}
                aria-describedby={count === null ? undefined : countId}
                onChange={() => {
                  const next = listed.filter((candidate) =>
                    candidate === option
                      ? !selected.has(option)
                      : selected.has(candidate),
                  );
                  if (next.length === 0) {
                    field.clear();
                  } else {
                    field.set(next);
                  }
                  if (!declared || (next.length === 0 && !offered)) {
                    // The checkbox that had focus leaves with the set — an
                    // undeclared one, or one offered only while it stands —
                    // or is disabled as an option the set may not regain:
                    // neither can keep focus.
                    onLeave();
                  }
                }}
              />
              {String(option)}
            </label>
            {count === null ? null : (
              <span id={countId} className="count">
                {count}
              </span>
            )}
          </div>
        );
      })}
      {renderSwitch()}
    </fieldset>
  );
}
