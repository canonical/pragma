import { Button } from "@canonical/react-ds-global";
import { SelectInput } from "@canonical/react-ds-global-form";
import { type ReactElement, useEffect, useId } from "react";
import { useDataViewsValue } from "../../../../hooks/index.js";
import { useDataViewsRoot } from "../../hooks/index.js";
import { DeleteConfirm, NameForm } from "./common/index.js";
import describeViewStatus from "./describeViewStatus.js";
import { usePanelFocus } from "./hooks/index.js";
import type { DataViewsSavedViewsProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds data-views-saved-views";

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
 * it and Revert discards the changes. Deleting asks first. A name that is
 * empty or another view's is refused before anything is written, beside the
 * input. The notices also say when the arrangement is not being saved,
 * which the provider's presentation reports.
 *
 * `import { DataViews } from "@canonical/dataviews-react";`
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export default function SavedViews({
  label,
  className,
  onFocus,
  onBlur,
  ...rest
}: DataViewsSavedViewsProps): ReactElement {
  const { provider, messages } = useDataViewsRoot("SavedViews");
  const { views, presentation } = provider;
  if (views === null) {
    throw new Error(
      "DataViews.SavedViews requires a provider given a view store; pass one to createDataViewsProvider",
    );
  }
  useEffect(() => views.observe(), [views]);
  const state = useDataViewsValue(views.state);
  // The reason alone: a width commit re-renders no saved-views control.
  const presentationReason = useDataViewsValue(
    presentation.state,
    (shown) => shown.presentationReason,
  );
  const { listing, current, modified, command } = state;
  const pending = command?.status === "pending";
  const {
    panel,
    select,
    opener,
    retry,
    openPanel,
    closePanel,
    cancelPanel,
    recordFocus,
    recordBlur,
  } = usePanelFocus({ pending, hasView: current !== null });
  const baseId = useId();

  const listed = listing.status === "ready";
  const conflicted =
    command?.status === "settled" &&
    command.command === "save" &&
    command.outcome.status === "conflict";
  const selectId = `${baseId}-view`;
  const modifiedId = `${baseId}-modified`;
  const unreadable = state.unreadable.length;

  const submitName = async (name: string): Promise<string | null> => {
    const outcome = await (panel === "rename"
      ? views.rename(name)
      : views.saveAs(name));
    if (outcome.status === "invalid") {
      return messages.viewNameRefused(outcome.reason);
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
      aria-label={label ?? messages.savedViews}
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      onFocus={(event) => {
        recordFocus(event);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        recordBlur(event);
        onBlur?.(event);
      }}
    >
      {listing.status === "idle" ? (
        <noscript>
          <p className="unavailable">{messages.viewsUnscripted}</p>
        </noscript>
      ) : (
        <>
          <div className="picker">
            <label htmlFor={selectId} className="label">
              {messages.view}
            </label>
            <SelectInput
              ref={select}
              id={selectId}
              options={[
                ...(current === null
                  ? [{ value: "", label: messages.viewNone, disabled: true }]
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
                {messages.viewModified}
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
              {conflicted ? messages.overwriteView : messages.saveView}
            </Button>
            <Button
              type="button"
              disabled={pending || current === null || !modified}
              onClick={views.revert}
            >
              {conflicted ? messages.discardViewChanges : messages.revertView}
            </Button>
            <Button
              type="button"
              disabled={pending || !listed}
              onClick={(event) => {
                openPanel("save-as", event.currentTarget);
              }}
            >
              {messages.saveViewAs}
            </Button>
            <Button
              type="button"
              disabled={pending || current === null || !listed}
              onClick={(event) => {
                openPanel("rename", event.currentTarget);
              }}
            >
              {messages.renameView}
            </Button>
            <Button
              type="button"
              disabled={pending || current === null}
              onClick={(event) => {
                openPanel("remove", event.currentTarget);
              }}
            >
              {messages.deleteView}
            </Button>
            {listing.status === "failed" || presentationReason !== null ? (
              <Button
                ref={retry}
                type="button"
                onClick={() => {
                  views.refresh();
                  presentation.refresh();
                }}
              >
                {messages.retryViews}
              </Button>
            ) : null}
          </div>
          {panel === "save-as" ? (
            <NameForm
              key="save-as"
              label={messages.saveAsForm}
              submit={messages.submitSaveAs}
              nameLabel={messages.viewName}
              cancel={messages.cancel}
              initial=""
              pending={pending}
              onSubmit={submitName}
              onCancel={cancelPanel}
            />
          ) : null}
          {panel === "rename" && current !== null ? (
            <NameForm
              key={`rename:${current.id}`}
              label={messages.renameForm(current.name)}
              submit={messages.submitRename}
              nameLabel={messages.viewName}
              cancel={messages.cancel}
              initial={current.name}
              pending={pending}
              onSubmit={submitName}
              onCancel={cancelPanel}
            />
          ) : null}
          {panel === "remove" && current !== null ? (
            <DeleteConfirm
              question={messages.deleteForm(current.name)}
              submit={messages.submitDelete}
              cancel={messages.cancel}
              pending={pending}
              onSubmit={() => {
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
            {describeViewStatus(command, modified, messages)}
          </p>
          <div role="status" className="notices">
            {listing.status === "pending" ? (
              <p>{messages.viewsPending}</p>
            ) : null}
            {listing.status === "failed" ? (
              <p>{messages.viewsUnavailable(listing.reason)}</p>
            ) : null}
            {unreadable > 0 ? (
              <p>{messages.viewsUnreadable(unreadable)}</p>
            ) : null}
            {presentationReason === null ? null : (
              <p>{messages.arrangementUnsaved(presentationReason)}</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
