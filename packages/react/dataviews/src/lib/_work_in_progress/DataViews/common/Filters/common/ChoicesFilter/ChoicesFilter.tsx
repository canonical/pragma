import type { PredicateOperand } from "@canonical/dataviews-core";
import { spellWireKey } from "@canonical/dataviews-core/bindings";
import type { ReactElement } from "react";
import { useFilterHandle } from "../../../../hooks/index.js";
import type { ChoicesFilterProps } from "./types.js";

const componentCssClassName = "ds data-views-filters-choices";

const NONE_SELECTED: ReadonlySet<PredicateOperand> = new Set();

/**
 * One closed-set filter: a checkbox per option, so the applied set is
 * visible and reachable without opening anything. Membership is the whole
 * state — the last option cleared removes the predicate rather than
 * applying an empty restriction that matches nothing. Every checkbox is
 * named by the field, as the wire spells equality, so a GET submission
 * repeats the field once per chosen option. Unchecking an option of an
 * undeclared set disables its checkbox, or removes the control with the
 * last, so focus moves to the filters' group.
 */
export default function ChoicesFilter({
  options,
  handle,
  label,
  field: fieldName,
  declared,
  onLeave,
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
            name={spellWireKey(fieldName, "eq")}
            value={String(option)}
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
              } else {
                field.set(next);
              }
              if (!declared) {
                // The checkbox that had focus leaves with the set, or is
                // disabled as an option the set may not regain: neither can
                // keep focus.
                onLeave();
              }
            }}
          />
          {String(option)}
        </label>
      ))}
    </fieldset>
  );
}
