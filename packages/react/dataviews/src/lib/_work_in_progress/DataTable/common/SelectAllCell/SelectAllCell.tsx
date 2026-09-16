import { CheckboxInput } from "@canonical/react-ds-global-form";
import { type ReactElement, useContext } from "react";
import { MessagesContext } from "../../../../common/index.js";
import {
  useDataViewsValue,
  useSelectAllOnPage,
} from "../../../../hooks/index.js";
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
  const messages = useContext(MessagesContext);
  const ids = useDataViewsValue(displayed);
  const { checked, mixed, toggle } = useSelectAllOnPage({ selection, ids });
  return (
    // biome-ignore lint/a11y/useSemanticElements: <th> is only valid inside a <table>, and this grid is deliberately not one
    // biome-ignore lint/a11y/useFocusableInteractive: the header is structure, not a widget — its checkbox carries the focus
    <div role="columnheader" className={componentCssClassName} ref={reserve}>
      <CheckboxInput
        checked={checked}
        aria-label={messages.selectAllRows}
        ref={(node) => {
          if (node !== null) {
            node.indeterminate = mixed;
          }
        }}
        onChange={toggle}
      />
    </div>
  );
}
