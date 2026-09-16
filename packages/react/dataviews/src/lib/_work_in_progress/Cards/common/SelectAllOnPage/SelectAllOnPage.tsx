import { CheckboxInput } from "@canonical/react-ds-global-form";
import { type ReactElement, useContext, useId } from "react";
import { MessagesContext } from "../../../../common/index.js";
import {
  useDataViewsValue,
  useSelectAllOnPage,
} from "../../../../hooks/index.js";
import type { SelectAllOnPageProps } from "./types.js";

const componentCssClassName = "select-all";

/**
 * The checkbox selecting every card on the page. Its scope is the cards
 * displayed, which its name says: it adds and removes exactly those
 * identities and leaves a selection made elsewhere in the collection alone.
 *
 * It holds the selection subscription alone, so a card checked or cleared
 * re-renders this control and no card but its own.
 */
export default function SelectAllOnPage({
  selection,
  ids: displayed,
}: SelectAllOnPageProps): ReactElement {
  const messages = useContext(MessagesContext);
  const ids = useDataViewsValue(displayed);
  const { checked, mixed, toggle } = useSelectAllOnPage({ selection, ids });
  const inputId = useId();
  // A checkbox's mixed state is a property, not an attribute, and React
  // writes no property it was not given. The ref is rebuilt whenever the
  // state moves, so React runs it again with the same node and the mark
  // follows the selection; a ref held at one identity would set it once and
  // leave it behind.
  const mark = (node: HTMLInputElement | null): void => {
    if (node !== null) {
      node.indeterminate = mixed;
    }
  };
  return (
    <div className={componentCssClassName}>
      <CheckboxInput
        id={inputId}
        ref={mark}
        checked={checked}
        onChange={toggle}
      />
      <label htmlFor={inputId}>{messages.selectAllRows}</label>
    </div>
  );
}
