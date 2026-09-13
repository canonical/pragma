import { Button } from "@canonical/react-ds-global";
import { type ReactElement, useCallback, useContext, useRef } from "react";
import { useMergedRef } from "../../../hooks/index.js";
import { pluralizeNoun } from "../../../utils/index.js";
import DataViewsContext from "../../Context.js";
import useDataViewsValue from "../../hooks/useDataViewsValue.js";
import type { DataViewsActionsProps } from "./types.js";
import "./styles.css";

/**
 * `contrasted` is the design system's contrasted surface: it sets the
 * surface channel the stylesheet reads, so the bar needs no colour of its
 * own.
 */
const componentCssClassName = "ds data-table-action-bar contrasted";

/**
 * What can be done with the current selection: how much is selected, the
 * actions a caller places, and a button that clears it.
 *
 * The bar reads the enclosing root's selection and takes no copy of it. It
 * is absent while nothing is selected. The count is the whole selection,
 * across pages, not the rows on screen.
 *
 * When the bar leaves with the focus inside it — the selection cleared, or
 * every target of an action succeeded — the focus returns to the control it
 * entered the bar from, rather than to the document.
 *
 * @implements ds:apps.subcomponent.data_table-action_bar
 */
export default function Actions({
  label = "Selection actions",
  indicator,
  children,
  className,
  onFocus,
  ref,
  ...rest
}: DataViewsActionsProps): ReactElement | null {
  const provider = useContext(DataViewsContext);
  if (provider === null) {
    throw new Error("DataViews.Actions must be used inside a DataViews root");
  }
  const { selection } = provider;
  const count = useDataViewsValue(selection.state).ids.size;

  // Where focus entered the bar from. React releases the bar's ref before
  // it removes the bar, so a bar leaving with the focus inside it can still
  // find the focus there and hand it back.
  const origin = useRef<HTMLElement | null>(null);
  const returnFocus = useCallback(
    (bar: HTMLDivElement) => () => {
      if (
        bar.contains(bar.ownerDocument.activeElement) &&
        origin.current?.isConnected
      ) {
        origin.current.focus();
      }
    },
    [],
  );
  // The bar's root is its own, so a caller's ref is merged onto it rather
  // than dropped: the focus goes back first, then the caller's ref is
  // released.
  const attach = useMergedRef(ref, returnFocus);

  if (count === 0) {
    return null;
  }
  return (
    // biome-ignore lint/a11y/useSemanticElements: a fieldset groups form controls under a legend; this groups commands under the name its label gives it
    <div
      {...rest}
      ref={attach}
      role="group"
      aria-label={label}
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      onFocus={(event) => {
        const from = event.relatedTarget;
        if (!event.currentTarget.contains(from)) {
          origin.current = from instanceof HTMLElement ? from : null;
        }
        onFocus?.(event);
      }}
    >
      {indicator === undefined ? (
        <span role="status" className="indicator">{`${count} selected`}</span>
      ) : (
        indicator
      )}
      {children}
      <Button
        type="button"
        importance="tertiary"
        icon="close"
        className="deselect"
        aria-label={`Deselect ${count} ${pluralizeNoun(count, "item")}`}
        onClick={() => {
          selection.clear();
        }}
      />
    </div>
  );
}
