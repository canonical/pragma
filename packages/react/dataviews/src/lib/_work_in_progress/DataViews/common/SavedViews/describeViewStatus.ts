import type { ViewCommand, ViewCommandState } from "@canonical/dataviews-core";

const PENDING: Readonly<Record<ViewCommand, string>> = {
  open: "Opening the view…",
  save: "Saving…",
  "save-as": "Saving…",
  rename: "Renaming…",
  remove: "Deleting…",
};

/** How a message starts when the command did not happen. */
const NOT_DONE: Readonly<Record<ViewCommand, string>> = {
  open: "Not opened",
  save: "Not saved",
  "save-as": "Not saved",
  rename: "Not renamed",
  remove: "Not deleted",
};

/**
 * What the saved-views control says about its latest command: what is in
 * flight, then what happened. A conflict or a failure never reads as saved,
 * and a confirmation that the query was opened or saved is withdrawn once
 * the query moves from it, where it would no longer be true.
 */
export default function describeViewStatus(
  state: ViewCommandState | null,
  modified: boolean,
): string {
  if (state === null) {
    return "";
  }
  const { command } = state;
  if (state.status === "pending") {
    return PENDING[command];
  }
  const { outcome } = state;
  switch (outcome.status) {
    case "opened":
      return modified ? "" : `Opened "${outcome.view.name}".`;
    case "saved":
      if (command === "rename") {
        return `Renamed to "${outcome.view.name}".`;
      }
      return modified ? "" : `Saved "${outcome.view.name}".`;
    case "removed":
      return "View deleted.";
    case "refused":
      return `Not opened: "${outcome.view.name}" asks for what this collection cannot show — ${outcome.issues
        .map((issue) => issue.reason)
        .join("; ")}. The query is unchanged.`;
    case "conflict":
      if (command === "save") {
        return `Not saved: "${outcome.view.name}" was changed elsewhere. Overwrite it, save your changes as a new view, or discard them.`;
      }
      if (command === "save-as") {
        return "Not saved: a different view is stored under the same identity. Try again.";
      }
      return `${NOT_DONE[command]}: "${outcome.view.name}" was changed elsewhere. Its latest version is open; try again.`;
    case "missing":
      return `${NOT_DONE[command]}: the view no longer exists.`;
    case "unreadable":
      return `${NOT_DONE[command]}: the stored view cannot be read (${outcome.reason}).`;
    case "failed":
      return `${NOT_DONE[command]}: ${outcome.reason}.`;
  }
}
