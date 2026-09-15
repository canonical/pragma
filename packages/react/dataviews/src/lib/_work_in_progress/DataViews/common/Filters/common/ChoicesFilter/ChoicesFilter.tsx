import type { PredicateOperand } from "@canonical/dataviews-core";
import {
  applyQueryCommand,
  spellWireKey,
} from "@canonical/dataviews-core/bindings";
import { Button } from "@canonical/react-ds-global";
import { type ReactElement, useId } from "react";
import {
  useHydrationFocusHandoff,
  useIsHydrated,
} from "../../../../../../hooks/index.js";
import { useFilterHandle } from "../../../../hooks/index.js";
import { NO_RECORDS } from "../constants.js";
import { spellCount } from "../utils/index.js";
import type { ChoicesFilterProps } from "./types.js";

const componentCssClassName = "ds data-views-filters-choices";

const NONE_SELECTED: ReadonlySet<PredicateOperand> = new Set();

/** What each set operator adds to the field's name in the legend. */
const LEGEND_WORDING = { isAny: " is any of", isNone: " is none of" } as const;

/** The other set operator, which a standing set may move to. */
const ALTERNATIVE_OPERATOR = { isAny: "isNone", isNone: "isAny" } as const;

/** What the control moving a set to each operator says. */
const SWITCH_WORDING = {
  isAny: "Match any of these instead",
  isNone: "Match none of these instead",
} as const;

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
 * values the latest facet lists with any the set already holds: they stay
 * until a newer result lists others — while a query is pending, or after it
 * fails, as the rows on screen are — and a restriction in force is never
 * hidden. Beside each option is how many matching records hold it, from the
 * facet, which the source computes over the whole matching set with this
 * field's own restriction lifted; the count describes its checkbox rather
 * than naming it, and is absent while no facet answers the applied query.
 *
 * While a set stands, the source declares the other set operator on the
 * field and nothing stands under it, the set can move there: a real link
 * before any script runs, and a button once it does, which moves it as one
 * transition.
 */
export default function ChoicesFilter({
  options,
  serverOwned,
  counts,
  handle,
  operator,
  alternativeDeclared,
  alternativeHandle,
  host,
  label,
  field: fieldName,
  declared,
  leavesWhenCleared,
  onLeave,
}: ChoicesFilterProps): ReactElement | null {
  const field = useFilterHandle(handle);
  const alternativeField = useFilterHandle(alternativeHandle);
  const hydrated = useIsHydrated();
  // The move link a server rendered and the button replacing it: the button
  // takes the link's focus, or the reader who tabbed to the move before
  // hydration is left on nothing.
  const { link: moveLink, button: moveButton } = useHydrationFocusHandoff({
    hydrated,
  });
  const baseId = useId();
  const standing = field.applied.kind === "value";
  const selected = standing ? field.applied.value : NONE_SELECTED;
  // Offered while nothing stands: any-of wherever it is declared; none-of
  // only where any-of is not, and otherwise reached by moving a standing set.
  const offered = declared && (operator === "isAny" || !alternativeDeclared);
  if (!offered && !standing) {
    return null;
  }
  // Each option once as its text, the set's own after those listed.
  const listed = serverOwned
    ? [...new Set([...options, ...Array.from(selected, String)])]
    : options;
  if (listed.length === 0) {
    return null;
  }
  /**
   * Where moving the set to the alternative leads: the query the core's own
   * transition makes of the applied one, so the link and the button arrive
   * at the same place.
   */
  const spellMove = (to: ChoicesFilterProps["operator"]): string | null => {
    // Read once, as rendered: the link is drawn only before hydration, when
    // nothing moves the query under it; once hydrated the button stands in.
    const { slice, window } = host.state.get();
    const moved = applyQueryCommand(slice, window, {
      kind: "setPredicate",
      predicate: { field: fieldName, operator: to, operands: [...selected] },
      replaces: operator,
    });
    const params = host.spellQuery({
      slice: moved.slice,
      window: moved.window,
    });
    return params === null ? null : `?${params}`;
  };
  const renderSwitch = (): ReactElement | null => {
    // A set moves only onto an empty one: moving onto a standing set would
    // overwrite a restriction in force.
    if (
      !alternativeDeclared ||
      !standing ||
      alternativeField.applied.kind === "value"
    ) {
      return null;
    }
    const alternative = ALTERNATIVE_OPERATOR[operator];
    const text = SWITCH_WORDING[alternative];
    if (hydrated) {
      return (
        <Button
          ref={moveButton}
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
      <a ref={moveLink} className="switch" href={destination}>
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
            : spellCount(counts.get(String(option)) ?? NO_RECORDS);
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
                  if (
                    !declared ||
                    // An option listed only because the set held it leaves
                    // with the set's hold on it, whatever else stays.
                    (serverOwned && !options.includes(String(option))) ||
                    (next.length === 0 && (!offered || leavesWhenCleared))
                  ) {
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
