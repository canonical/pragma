import type { ViewAction, ViewOperation } from "@canonical/dataviews-core";

const PENDING: Readonly<Record<ViewAction, string>> = {
  open: "Opening the view…",
  save: "Saving…",
  saveAs: "Saving…",
  rename: "Renaming…",
  remove: "Deleting…",
};

/** How a message starts when the operation did not happen. */
const NOT_DONE: Readonly<Record<ViewAction, string>> = {
  open: "Not opened",
  save: "Not saved",
  saveAs: "Not saved",
  rename: "Not renamed",
  remove: "Not deleted",
};

/**
 * What the views control says about its latest operation: what is in flight,
 * then what happened. A conflict or a failure never reads as saved, and a
 * confirmation that the query was opened or saved is withdrawn once the query
 * moves from it, where it would no longer be true.
 */
export default function viewStatusText(
  operation: ViewOperation | null,
  modified: boolean,
): string {
  if (operation === null) {
    return "";
  }
  const { action } = operation;
  if (operation.status === "pending") {
    return PENDING[action];
  }
  const { outcome } = operation;
  switch (outcome.status) {
    case "opened":
      return modified ? "" : `Opened "${outcome.view.name}".`;
    case "saved":
      if (action === "rename") {
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
      if (action === "save") {
        return `Not saved: "${outcome.view.name}" was changed elsewhere. Overwrite it, save your changes as a new view, or discard them.`;
      }
      if (action === "saveAs") {
        return "Not saved: a different view is stored under the same identity. Try again.";
      }
      return `${NOT_DONE[action]}: "${outcome.view.name}" was changed elsewhere. Its latest version is open; try again.`;
    case "missing":
      return `${NOT_DONE[action]}: the view no longer exists.`;
    case "unreadable":
      return `${NOT_DONE[action]}: the stored view cannot be read (${outcome.reason}).`;
    case "failed":
      return `${NOT_DONE[action]}: ${outcome.reason}.`;
  }
}
