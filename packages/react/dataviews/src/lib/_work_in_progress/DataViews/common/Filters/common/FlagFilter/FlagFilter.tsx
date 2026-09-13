import type { ReactElement } from "react";
import { useDataViewsField } from "../../../../hooks/index.js";
import type { FlagFilterProps } from "./types.js";

const componentCssClassName = "ds data-views-filters-flag";

/**
 * One presence filter: the predicate is either applied or absent, so the
 * checkbox applies it and unchecking removes it. There is no third state
 * asserting the field is unset — the grammar has no operator for that.
 */
export default function FlagFilter({
  handle,
  label,
  declared,
}: FlagFilterProps): ReactElement | null {
  const field = useDataViewsField(handle);
  const applied = field.applied.kind === "value";
  if (!declared && !applied) {
    return null;
  }
  return (
    <div className={componentCssClassName}>
      <label className="option">
        <input
          type="checkbox"
          checked={applied}
          onChange={() => {
            if (applied) {
              field.clear();
              return;
            }
            field.set([]);
          }}
        />
        {label}
      </label>
    </div>
  );
}
