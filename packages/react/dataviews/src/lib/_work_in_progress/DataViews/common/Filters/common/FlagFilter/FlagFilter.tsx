import { spellWireKey } from "@canonical/dataviews-core/bindings";
import { type ReactElement, useId } from "react";
import { spellCount } from "../../../../../../utils/index.js";
import { useDataViewsRoot, useFilterHandle } from "../../../../hooks/index.js";
import type { FlagFilterProps } from "./types.js";

const componentCssClassName = "ds data-views-filters-flag";

/**
 * One presence filter: the predicate is either applied or absent, so the
 * checkbox applies it and unchecking removes it. There is no third state
 * asserting the field is unset — the grammar has no operator for that. The
 * checkbox is named as the wire spells presence, and its value is the
 * marker the encoder writes, so a GET submission is the same clause.
 * Unchecking an undeclared flag removes the control, so focus moves to the
 * filters' group. Beside the checkbox is how many matching records set the
 * field, from the facet, describing the checkbox while a facet answers the
 * applied query.
 */
export default function FlagFilter({
  handle,
  count,
  label,
  field: fieldName,
  declared,
  leavesWhenCleared,
  onLeave,
}: FlagFilterProps): ReactElement | null {
  const { messages } = useDataViewsRoot("Filters");
  const field = useFilterHandle(handle);
  const countId = useId();
  const applied = field.applied.kind === "value";
  if (!declared && !applied) {
    return null;
  }
  const spelled = count === null ? null : spellCount(count, messages);
  return (
    <div className={componentCssClassName}>
      <label className="option">
        <input
          type="checkbox"
          name={spellWireKey(fieldName, "isSet")}
          value="1"
          checked={applied}
          aria-describedby={spelled === null ? undefined : countId}
          onChange={() => {
            if (applied) {
              field.clear();
              if (leavesWhenCleared) {
                // The control leaves with the checkbox that had focus.
                onLeave();
              }
              return;
            }
            field.set([]);
          }}
        />
        {label}
      </label>
      {spelled === null ? null : (
        <span id={countId} className="count">
          {spelled}
        </span>
      )}
    </div>
  );
}
