import type {
  DataViewsMessages,
  ViewCommandState,
} from "@canonical/dataviews-core";

/**
 * What the saved-views control says about its latest command, in the root's
 * words: what is in flight, then what happened. A conflict or a failure
 * never reads as saved, and a confirmation that the query was opened or
 * saved is withdrawn once the query moves from it, where it would no longer
 * be true.
 */
export default function describeViewStatus(
  state: ViewCommandState | null,
  modified: boolean,
  messages: DataViewsMessages,
): string {
  if (state === null) {
    return "";
  }
  const { command } = state;
  if (state.status === "pending") {
    return messages.viewPending(command);
  }
  const { outcome } = state;
  switch (outcome.status) {
    case "opened":
      return modified ? "" : messages.viewOpened(outcome.view.name);
    case "saved":
      if (command === "rename") {
        return messages.viewRenamed(outcome.view.name);
      }
      return modified ? "" : messages.viewSaved(outcome.view.name);
    case "removed":
      return messages.viewDeleted;
    case "refused":
      return messages.viewRefused(
        outcome.view.name,
        outcome.issues.map((issue) => issue.reason),
      );
    case "conflict":
      return messages.viewConflicted(command, outcome.view.name);
    case "missing":
      return messages.viewMissing(command);
    case "unreadable":
      return messages.viewUnreadable(command, outcome.reason);
    case "failed":
      return messages.viewFailed(command, outcome.reason);
  }
}
