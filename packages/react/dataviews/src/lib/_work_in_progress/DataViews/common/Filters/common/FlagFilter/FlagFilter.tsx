import { spellWireKey } from "@canonical/dataviews-core/bindings";
import type { ReactElement } from "react";
import { useFilterHandle } from "../../../../hooks/index.js";
import type { FlagFilterProps } from "./types.js";

const componentCssClassName = "ds data-views-filters-flag";

/**
 * One presence filter: the predicate is either applied or absent, so the
 * checkbox applies it and unchecking removes it. There is no third state
 * asserting the field is unset — the grammar has no operator for that. The
 * checkbox is named as the wire spells presence, and its value is the
 * marker the encoder writes, so a GET submission is the same clause.
 */
export default function FlagFilter({
  handle,
  label,
  field: fieldName,
  declared,
}: FlagFilterProps): ReactElement | null {
  const field = useFilterHandle(handle);
  const applied = field.applied.kind === "value";
  if (!declared && !applied) {
    return null;
  }
  return (
    <div className={componentCssClassName}>
      <label className="option">
        <input
          type="checkbox"
          name={spellWireKey(fieldName, "isSet")}
          value="1"
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
