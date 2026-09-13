import { Button } from "@canonical/react-ds-global";
import { SelectInput } from "@canonical/react-ds-global-form";
import {
  type ReactElement,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { composeSentence, pluralizeNoun } from "../../../utils/index.js";
import DataViewsContext from "../../Context.js";
import useDataViewsValue from "../../hooks/useDataViewsValue.js";
import { DeleteConfirm, NameForm } from "./common/index.js";
import type { DataViewsViewsProps } from "./types.js";
import viewStatusText from "./viewStatusText.js";
import "./styles.css";

const componentCssClassName = "ds data-views-views";

/** The panel open beneath the commands, if any. */
type Panel = "saveAs" | "rename" | "remove" | null;

/**
 * The collection's saved views: which view is open, whether the query has
 * moved from it, and the way to switch, save, save as, rename and delete.
 *
 * It reads the views of the enclosing root's provider, over the store the
 * application gave it, and throws without one: there are no views kept in
 * memory instead. Views live in the browser, so without JavaScript the
 * control says only that they are unavailable; a link to a query still
 * works, since the query is in the URL.
 *
 * Every outcome is said in a polite status, a conflict or a failure never as
 * saved. After a conflict the stored view is the open one: Save overwrites
 * it and Reset discards the changes. Deleting asks first. A name that is
 * empty or another view's is refused before anything is written, beside the
 * input.
 *
 * The focus is never stranded: a panel returns it to the command that opened
 * it, and a control that becomes unavailable under it hands it to the view
 * select, or to Try again while the views are unavailable.
 */
export default function Views({
  label = "Saved views",
  className,
  onFocus,
  onBlur,
  ...rest
}: DataViewsViewsProps): ReactElement {
  const provider = useContext(DataViewsContext);
  if (provider === null) {
    throw new Error("DataViews.Views must be used inside a DataViews root");
  }
  const { views } = provider;
  if (views === null) {
    throw new Error(
      "DataViews.Views requires a provider given a view store; pass one to createDataViewsProvider",
    );
  }
  useEffect(() => views.observe(), [views]);
  const state = useDataViewsValue(views.state);
  const { listing, current, modified, operation } = state;
  const pending = operation?.status === "pending";
  const [panel, setPanel] = useState<Panel>(null);
  const select = useRef<HTMLSelectElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  // What the focus was last on inside the control, until it leaves. A
  // control disabled or removed under the focus reports no blur, so this
  // finds the focus stranded.
  const focused = useRef<HTMLElement>(null);
  const retry = useRef<HTMLButtonElement>(null);
  // Where a closing panel sends the focus: state, so closing always renders.
  const [returnTo, setReturnTo] = useState<HTMLElement | null>(null);
  const baseId = useId();

  // Once nothing is pending, a closed panel returns the focus to the command
  // that opened it, and a control that became unavailable or went away under
  // the focus hands it to the view select — or, while the views are
  // unavailable and the select with them, to Try again. A layout effect, so
  // the focus moves in the commit that stranded it, never after a paint.
  useLayoutEffect(() => {
    if (pending) {
      return;
    }
    if (returnTo !== null) {
      // Taking the focus records it as focused; a target that cannot take
      // it leaves the focus stranded where it was.
      returnTo.focus();
      setReturnTo(null);
    }
    const stranded = focused.current;
    if (
      stranded !== null &&
      (!stranded.isConnected || stranded.matches(":disabled"))
    ) {
      focused.current = null;
      // Only focus that was lost: never from another element the user moved it to.
      const { activeElement, body } = stranded.ownerDocument;
      const lost: readonly (Element | null)[] = [stranded, body, null];
      if (lost.includes(activeElement)) {
        (select.current?.disabled ? retry.current : select.current)?.focus();
      }
    }
  });

  // A rename or delete panel closes with the view it was about.
  if (current === null && (panel === "rename" || panel === "remove")) {
    setPanel(null);
  }

  const openPanel = (next: Panel, from: HTMLButtonElement): void => {
    opener.current = from;
    setPanel(next);
  };
  const closePanel = (focus: HTMLElement | null = opener.current): void => {
    setReturnTo(focus);
    setPanel(null);
  };
  // Never `closePanel` itself as a handler: an event is no focus target.
  const cancelPanel = (): void => {
    closePanel();
  };

  const listed = listing.status === "ready";
  const conflicted =
    operation?.status === "settled" &&
    operation.action === "save" &&
    operation.outcome.status === "conflict";
  const selectId = `${baseId}-view`;
  const modifiedId = `${baseId}-modified`;
  const unreadable = state.unreadable.length;

  const submitName = async (name: string): Promise<string | null> => {
    const outcome = await (panel === "rename"
      ? views.rename(name)
      : views.saveAs(name));
    if (outcome.status === "invalid") {
      return composeSentence(outcome.reason);
    }
    if (outcome.status === "saved") {
      closePanel();
    }
    return null;
  };

  return (
    // biome-ignore lint/a11y/useSemanticElements: a fieldset groups form controls under a legend; this groups a control's parts under the name its label gives it
    <div
      {...rest}
      role="group"
      aria-label={label}
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      onFocus={(event) => {
        focused.current = event.target;
        onFocus?.(event);
      }}
      onBlur={(event) => {
        // Focus leaving for nowhere may be its control going away.
        if (event.relatedTarget !== null) {
          focused.current = null;
        }
        onBlur?.(event);
      }}
    >
      {listing.status === "idle" ? (
        <noscript>
          <p className="unavailable">
            Saved views need JavaScript. A link to a query still works.
          </p>
        </noscript>
      ) : (
        <>
          <div className="picker">
            <label htmlFor={selectId} className="label">
              View
            </label>
            <SelectInput
              ref={select}
              id={selectId}
              options={[
                ...(current === null
                  ? [{ value: "", label: "No saved view", disabled: true }]
                  : []),
                ...state.views.map((view) => ({
                  value: view.id,
                  label: view.name,
                })),
              ]}
              value={current?.id ?? ""}
              disabled={!listed}
              aria-describedby={modified ? modifiedId : undefined}
              onChange={(event) => {
                void views.open(event.target.value);
              }}
            />
            {modified ? (
              <span id={modifiedId} className="modified">
                Modified
              </span>
            ) : null}
          </div>
          <div className="commands">
            <Button
              type="button"
              disabled={pending || current === null || !modified}
              onClick={() => {
                void views.save();
              }}
            >
              {conflicted ? "Overwrite" : "Save"}
            </Button>
            <Button
              type="button"
              disabled={pending || current === null || !modified}
              onClick={views.reset}
            >
              {conflicted ? "Discard changes" : "Reset"}
            </Button>
            <Button
              type="button"
              disabled={pending || !listed}
              onClick={(event) => {
                openPanel("saveAs", event.currentTarget);
              }}
            >
              Save as…
            </Button>
            <Button
              type="button"
              disabled={pending || current === null || !listed}
              onClick={(event) => {
                openPanel("rename", event.currentTarget);
              }}
            >
              Rename…
            </Button>
            <Button
              type="button"
              disabled={pending || current === null}
              onClick={(event) => {
                openPanel("remove", event.currentTarget);
              }}
            >
              Delete…
            </Button>
            {listing.status === "failed" ||
            state.presentationFailure !== null ? (
              <Button ref={retry} type="button" onClick={views.reload}>
                Try again
              </Button>
            ) : null}
          </div>
          {panel === "saveAs" ? (
            <NameForm
              key="saveAs"
              label="Save as a new view"
              submit="Save view"
              initial=""
              pending={pending}
              onSubmit={submitName}
              onCancel={cancelPanel}
            />
          ) : null}
          {panel === "rename" && current !== null ? (
            <NameForm
              key={`rename:${current.id}`}
              label={`Rename "${current.name}"`}
              submit="Rename"
              initial={current.name}
              pending={pending}
              onSubmit={submitName}
              onCancel={cancelPanel}
            />
          ) : null}
          {panel === "remove" && current !== null ? (
            <DeleteConfirm
              name={current.name}
              pending={pending}
              onConfirm={() => {
                void views.remove().then((outcome) => {
                  closePanel(
                    outcome.status === "removed"
                      ? select.current
                      : opener.current,
                  );
                });
              }}
              onCancel={cancelPanel}
            />
          ) : null}
          <p role="status" className="status">
            {viewStatusText(operation, modified)}
          </p>
          <div role="status" className="notices">
            {listing.status === "pending" ? <p>Loading saved views…</p> : null}
            {listing.status === "failed" ? (
              <p>{`Saved views are unavailable: ${listing.reason}.`}</p>
            ) : null}
            {unreadable > 0 ? (
              <p>{`${unreadable} saved ${pluralizeNoun(unreadable, "view")} cannot be read.`}</p>
            ) : null}
            {state.presentationFailure === null ? null : (
              <p>{`Column widths are not being saved: ${state.presentationFailure}.`}</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
