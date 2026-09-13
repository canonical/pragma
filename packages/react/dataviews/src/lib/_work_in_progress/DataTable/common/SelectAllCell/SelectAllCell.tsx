import { CheckboxInput } from "@canonical/react-ds-global-form";
import { type ReactElement, useMemo } from "react";
import { useDataViewsValue } from "../../../DataViews/hooks/index.js";
import type { SelectAllCellProps } from "./types.js";

const componentCssClassName = "ds data-table-header-cell selection";

/**
 * The select-all checkbox. Its scope is the displayed rows, which its name
 * says: it adds and removes exactly those identities and leaves a selection
 * made elsewhere in the collection alone.
 */
export default function SelectAllCell({
  selection,
  ids: displayed,
  reserve,
}: SelectAllCellProps): ReactElement {
  const state = useDataViewsValue(selection.state);
  const ids = useDataViewsValue(displayed);
  // Counted, not filtered: this runs on every render of the header, and
  // an intermediate array per render is one allocation and one scan the
  // count does not need.
  const selected = useMemo(() => {
    let count = 0;
    for (const id of ids) {
      if (state.ids.has(id)) {
        count += 1;
      }
    }
    return count;
  }, [ids, state]);
  const all = ids.length > 0 && selected === ids.length;
  const some = selected > 0 && !all;
  return (
    // biome-ignore lint/a11y/useSemanticElements: <th> is only valid inside a <table>, and this grid is deliberately not one
    // biome-ignore lint/a11y/useFocusableInteractive: the header is structure, not a widget — its checkbox carries the focus
    <div role="columnheader" className={componentCssClassName} ref={reserve}>
      <CheckboxInput
        checked={all}
        aria-label="Select all displayed rows"
        ref={(node) => {
          if (node !== null) {
            node.indeterminate = some;
          }
        }}
        onChange={() => {
          if (all) {
            selection.remove(ids);
          } else {
            selection.add(ids);
          }
        }}
      />
    </div>
  );
}
