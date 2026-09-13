import type { PredicateOperand } from "@canonical/dataviews-core";
import type { ReactElement } from "react";
import { useFilterHandle } from "../../../../hooks/index.js";
import type { ChoicesFilterProps } from "./types.js";

const componentCssClassName = "ds data-views-filters-choices";

const NONE_SELECTED: ReadonlySet<PredicateOperand> = new Set();

/**
 * One closed-set filter: a checkbox per option, so the applied set is
 * visible and reachable without opening anything. Membership is the whole
 * state — the last option cleared removes the predicate rather than
 * applying an empty restriction that matches nothing.
 */
export default function ChoicesFilter({
  options,
  handle,
  label,
  declared,
}: ChoicesFilterProps): ReactElement | null {
  const field = useFilterHandle(handle);
  if (!declared && field.applied.kind === "empty") {
    return null;
  }
  const selected =
    field.applied.kind === "value" ? field.applied.value : NONE_SELECTED;
  return (
    <fieldset className={componentCssClassName}>
      <legend className="legend">{label}</legend>
      {options.map((option) => (
        <label key={String(option)} className="option">
          <input
            type="checkbox"
            checked={selected.has(option)}
            // Undeclared, the set may only shrink: adding an option would
            // be a restriction the source never offered.
            disabled={!declared && !selected.has(option)}
            onChange={() => {
              const next = options.filter((candidate) =>
                candidate === option
                  ? !selected.has(option)
                  : selected.has(candidate),
              );
              if (next.length === 0) {
                field.clear();
                return;
              }
              field.set(next);
            }}
          />
          {String(option)}
        </label>
      ))}
    </fieldset>
  );
}
